# E2E test pipeline on AWS CodeBuild (homework #8, "star" task).
# Opt-in: nothing here is created unless e2e_enabled = true, so the regular
# infrastructure deploy is unaffected. Tests live in aqa/, the build steps in aqa/buildspec.yml
# (inlined into the project at apply time).
#
#   terraform apply -var e2e_enabled=true -var 'e2e_api_url=https://<api-id>.execute-api.us-west-2.amazonaws.com/develop'
#   aws codebuild start-build --project-name restaurant-e2e
#
# Results: CodeBuild → Report groups (JUnit), HTML report + traces in the e2e reports bucket,
# and Report Portal when e2e_report_portal_* are set.

variable "e2e_enabled" {
  description = "Create the CodeBuild E2E test pipeline"
  type        = bool
  default     = false
}

variable "e2e_repository_url" {
  description = "Public Git repository with the aqa/ test suite"
  type        = string
  default     = "https://github.com/granchenkooleg/marathon2026.git"
}

variable "e2e_source_version" {
  description = "Branch, tag or commit the pipeline tests"
  type        = string
  default     = "master"
}

variable "e2e_api_url" {
  description = "Backend API Gateway stage URL (created by Syndicate, so it cannot be read from this state)"
  type        = string
  default     = ""

  validation {
    condition     = var.e2e_api_url == "" || can(regex("^https://", var.e2e_api_url))
    error_message = "e2e_api_url must start with https://."
  }
}

variable "e2e_base_url" {
  description = "Frontend URL; empty = this stack's CloudFront distribution"
  type        = string
  default     = ""
}

variable "e2e_schedule_expression" {
  description = "Optional schedule for regular runs, e.g. cron(0 4 ? * MON-FRI *). Empty = start runs manually"
  type        = string
  default     = ""
}

variable "e2e_report_portal_endpoint" {
  description = "Optional Report Portal API endpoint reachable from AWS, e.g. https://rp.example.com/api/v1"
  type        = string
  default     = ""
}

variable "e2e_report_portal_project" {
  description = "Report Portal project name"
  type        = string
  default     = ""
}

variable "e2e_report_portal_api_key_parameter" {
  description = "Name of an SSM SecureString parameter holding the Report Portal API key, e.g. /restaurant/e2e/rp-api-key"
  type        = string
  default     = ""
}

locals {
  e2e_count        = var.e2e_enabled ? 1 : 0
  e2e_project_name = "restaurant-e2e"
  e2e_base_url     = var.e2e_base_url != "" ? var.e2e_base_url : "https://${aws_cloudfront_distribution.frontend.domain_name}"
  e2e_use_rp       = var.e2e_report_portal_endpoint != "" && var.e2e_report_portal_project != "" && var.e2e_report_portal_api_key_parameter != ""
}

# --- Reports bucket: HTML report, traces, videos (kept 14 days) ---

resource "aws_s3_bucket" "e2e_reports" {
  count         = local.e2e_count
  bucket        = "restaurant-e2e-reports-${var.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "e2e_reports" {
  count  = local.e2e_count
  bucket = aws_s3_bucket.e2e_reports[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "e2e_reports" {
  count                   = local.e2e_count
  bucket                  = aws_s3_bucket.e2e_reports[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "e2e_reports" {
  count  = local.e2e_count
  bucket = aws_s3_bucket.e2e_reports[0].id

  rule {
    id     = "expire-old-runs"
    status = "Enabled"
    filter {}
    expiration {
      days = 14
    }
  }
}

resource "aws_cloudwatch_log_group" "e2e" {
  count             = local.e2e_count
  name              = "/aws/codebuild/${local.e2e_project_name}"
  retention_in_days = 14
}

# --- IAM: what the build may touch ---

resource "aws_iam_role" "codebuild_e2e" {
  count = local.e2e_count
  name  = "${local.e2e_project_name}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = "sts:AssumeRole"
        Principal = { Service = "codebuild.amazonaws.com" }
      },
    ]
  })
}

resource "aws_iam_role_policy" "codebuild_e2e" {
  count = local.e2e_count
  name  = "${local.e2e_project_name}-codebuild-policy"
  role  = aws_iam_role.codebuild_e2e[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Effect   = "Allow"
          Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
          Resource = "${aws_cloudwatch_log_group.e2e[0].arn}:*"
        },
        {
          Effect   = "Allow"
          Action   = ["s3:PutObject", "s3:GetObject", "s3:GetBucketLocation"]
          Resource = [aws_s3_bucket.e2e_reports[0].arn, "${aws_s3_bucket.e2e_reports[0].arn}/*"]
        },
        {
          Effect = "Allow"
          Action = [
            "codebuild:CreateReportGroup",
            "codebuild:CreateReport",
            "codebuild:UpdateReport",
            "codebuild:BatchPutTestCases",
          ]
          Resource = "arn:aws:codebuild:${var.aws_region}:${var.account_id}:report-group/${local.e2e_project_name}-*"
        },
      ],
      local.e2e_use_rp ? [
        {
          Effect   = "Allow"
          Action   = ["ssm:GetParameters"]
          Resource = "arn:aws:ssm:${var.aws_region}:${var.account_id}:parameter/${trimprefix(var.e2e_report_portal_api_key_parameter, "/")}"
        },
      ] : [],
    )
  })
}

# --- The pipeline ---

resource "aws_codebuild_project" "e2e" {
  count         = local.e2e_count
  name          = local.e2e_project_name
  description   = "Playwright E2E tests (UI + API) against the deployed restaurant app"
  service_role  = aws_iam_role.codebuild_e2e[0].arn
  build_timeout = 30

  # NO_SOURCE + an anonymous `git clone` in the buildspec: works for a public repository without
  # connecting GitHub credentials to CodeBuild. The buildspec is read from the repo at apply time,
  # so re-run `terraform apply` after changing aqa/buildspec.yml.
  source {
    type      = "NO_SOURCE"
    buildspec = file("${path.module}/../../aqa/buildspec.yml")
  }

  artifacts {
    type           = "S3"
    location       = aws_s3_bucket.e2e_reports[0].bucket
    path           = "runs"
    namespace_type = "BUILD_ID"
    packaging      = "NONE"
    name           = "e2e"
  }

  environment {
    compute_type = "BUILD_GENERAL1_MEDIUM" # 4 vCPU / 7 GB for 4 parallel browser workers
    image        = "aws/codebuild/standard:7.0"
    type         = "LINUX_CONTAINER"

    environment_variable {
      name  = "E2E_REPOSITORY_URL"
      value = var.e2e_repository_url
    }
    environment_variable {
      name  = "E2E_SOURCE_VERSION"
      value = var.e2e_source_version
    }
    environment_variable {
      name  = "BASE_URL"
      value = local.e2e_base_url
    }
    environment_variable {
      name  = "API_URL"
      value = var.e2e_api_url
    }

    dynamic "environment_variable" {
      for_each = local.e2e_use_rp ? {
        RP_ENDPOINT = { value = var.e2e_report_portal_endpoint, type = "PLAINTEXT" }
        RP_PROJECT  = { value = var.e2e_report_portal_project, type = "PLAINTEXT" }
        RP_API_KEY  = { value = var.e2e_report_portal_api_key_parameter, type = "PARAMETER_STORE" }
      } : {}
      content {
        name  = environment_variable.key
        value = environment_variable.value.value
        type  = environment_variable.value.type
      }
    }
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.e2e[0].name
    }
  }
}

# --- Optional schedule (EventBridge Scheduler, like weekly_reports) ---

resource "aws_iam_role" "e2e_scheduler" {
  count = var.e2e_enabled && var.e2e_schedule_expression != "" ? 1 : 0
  name  = "${local.e2e_project_name}-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = "sts:AssumeRole"
        Principal = { Service = "scheduler.amazonaws.com" }
      },
    ]
  })
}

resource "aws_iam_role_policy" "e2e_scheduler" {
  count = length(aws_iam_role.e2e_scheduler)
  name  = "${local.e2e_project_name}-scheduler-policy"
  role  = aws_iam_role.e2e_scheduler[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["codebuild:StartBuild"]
        Resource = aws_codebuild_project.e2e[0].arn
      },
    ]
  })
}

resource "aws_scheduler_schedule" "e2e" {
  count       = length(aws_iam_role.e2e_scheduler)
  name        = "${local.e2e_project_name}-schedule"
  group_name  = "default"
  description = "Regular E2E regression run"

  schedule_expression          = var.e2e_schedule_expression
  schedule_expression_timezone = "UTC"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:codebuild:startBuild"
    role_arn = aws_iam_role.e2e_scheduler[0].arn
    input    = jsonencode({ ProjectName = aws_codebuild_project.e2e[0].name })
  }
}

output "e2e_codebuild_project" {
  description = "Start a run: aws codebuild start-build --project-name <this>"
  value       = var.e2e_enabled ? aws_codebuild_project.e2e[0].name : null
}

output "e2e_reports_bucket" {
  description = "S3 bucket with HTML reports and failure evidence (runs/<build-id>/e2e/)"
  value       = var.e2e_enabled ? aws_s3_bucket.e2e_reports[0].bucket : null
}

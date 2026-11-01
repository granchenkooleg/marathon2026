import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';

// One id per run, shared by all workers (they inherit the runner's environment).
process.env.AQA_RUN_ID ??= Date.now().toString(36);

const isCI = !!process.env.CI;

const reporters: ReporterDescription[] = [
  [isCI ? 'github' : 'list'],
  ['html', { outputFolder: 'reports/html', open: 'never' }],
  ['junit', { outputFile: 'reports/junit.xml' }],
  ['json', { outputFile: 'reports/results.json' }],
];

// Report Portal is opt-in: it is used only when all three variables are set (see README, "Report Portal").
const reportPortalEnabled = !!(process.env.RP_ENDPOINT && process.env.RP_API_KEY && process.env.RP_PROJECT);
if (reportPortalEnabled) {
  const trigger = process.env.CODEBUILD_BUILD_ID ? 'aws-codebuild' : process.env.GITHUB_ACTIONS ? 'github-actions' : 'local';
  reporters.push([
    '@reportportal/agent-js-playwright',
    {
      endpoint: process.env.RP_ENDPOINT,
      apiKey: process.env.RP_API_KEY,
      project: process.env.RP_PROJECT,
      launch: process.env.RP_LAUNCH || 'green-tasty-e2e',
      description: `E2E run ${process.env.AQA_RUN_ID} against ${env.baseUrl}`,
      attributes: [
        { key: 'trigger', value: trigger },
        { key: 'run', value: process.env.AQA_RUN_ID },
      ],
      includeTestSteps: true,
      uploadTrace: true,
      uploadVideo: true,
    },
  ]);
}

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  globalSetup: require.resolve('./src/support/global-setup'),
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry in CI absorbs a cold-start Lambda timeout; a test that passes only on retry
  // is reported as "flaky" in the HTML report, so it stays visible.
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: reporters,
  use: {
    baseURL: env.baseUrl,
    // The backend works in UTC (working day ends 22:00 UTC); running the browser in UTC keeps
    // UI labels and API timestamps comparable and the tests independent of the runner's zone.
    timezoneId: 'UTC',
    locale: 'en-US',
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
});

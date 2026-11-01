import type { APIRequestContext } from '@playwright/test';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

/** Error body shape used by the backend: `{ "error": "..." }` (most handlers) or `{ "message": "..." }`. */
export interface ApiError {
  error?: string;
  message?: string;
}

export function errorText(body: unknown): string {
  if (body && typeof body === 'object') {
    const err = body as ApiError;
    return err.error ?? err.message ?? JSON.stringify(body);
  }
  return String(body);
}

/**
 * Thin HTTP client over Playwright's APIRequestContext, so every call shows up in the trace.
 * Builds absolute URLs itself: API_URL contains a stage path (`/develop`) that a leading-slash
 * relative path would silently drop.
 */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly apiUrl: string,
    private readonly idToken?: string,
  ) {}

  withToken(idToken: string): ApiClient {
    return new ApiClient(this.request, this.apiUrl, idToken);
  }

  anonymous(): ApiClient {
    return new ApiClient(this.request, this.apiUrl);
  }

  async send<T = unknown>(
    method: HttpMethod,
    path: string,
    options: { data?: unknown; params?: Record<string, string | number> } = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.apiUrl}/${path.replace(/^\/+/, '')}`;
    const response = await this.request.fetch(url, {
      method,
      data: options.data,
      params: options.params,
      headers: {
        'Content-Type': 'application/json',
        ...(this.idToken ? { Authorization: `Bearer ${this.idToken}` } : {}),
      },
      failOnStatusCode: false,
      // .NET Lambda cold starts under parallel load can take well over 15 s.
      timeout: 45_000,
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON body: keep raw text
    }
    return { status: response.status(), body: body as T };
  }
}

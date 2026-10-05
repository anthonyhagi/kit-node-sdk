import { ApiError } from "./errors";
import { delay } from "./utils/helpers";

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | (string & {});

type ApiClientOptions = {
  baseUrl: string;
  maxRetries?: number;
  retryDelay?: number;
  timeoutMs?: number | undefined;
};

export class ApiClient {
  baseUrl: string;
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;

  constructor({
    baseUrl,
    maxRetries = 3,
    retryDelay = 1000,
    timeoutMs = 0,
  }: ApiClientOptions) {
    if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) {
      throw new RangeError("maxRetries must be a non-negative safe integer");
    }
    if (!Number.isFinite(retryDelay) || retryDelay < 0) {
      throw new RangeError("retryDelay must be a finite non-negative number");
    }
    if (
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 0 ||
      timeoutMs > 2 ** 31 - 1
    ) {
      throw new RangeError(
        "timeoutMs must be an integer between 0 and 2147483647"
      );
    }

    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Set the default auth headers.
   *
   * @returns The auth headers to set for each request.
   */
  protected authHeaders(): Record<string, string> {
    return {};
  }

  /**
   * Set the default headers to attach to every request.
   *
   * @returns The default auth headers.
   */
  protected defaultHeaders(): Record<string, string> {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": this.getUserAgent(),
    };
  }

  public async get<TResponseType = unknown>(
    path: string,
    options?: {
      /** Cancel this request, including response reads and retry waits. */
      signal?: AbortSignal | undefined;
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
    }
  ): Promise<TResponseType> {
    return await this.request<TResponseType>("GET", path, options);
  }

  public async post<TResponseType = unknown>(
    path: string,
    options?: {
      /** Cancel this request, including response reads and retry waits. */
      signal?: AbortSignal | undefined;
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ) {
    return await this.request<TResponseType>("POST", path, options);
  }

  public async put<TResponseType = unknown>(
    path: string,
    options?: {
      /** Cancel this request, including response reads and retry waits. */
      signal?: AbortSignal | undefined;
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ) {
    return await this.request<TResponseType>("PUT", path, options);
  }

  public async patch<TResponseType = unknown>(
    path: string,
    options?: {
      /** Cancel this request, including response reads and retry waits. */
      signal?: AbortSignal | undefined;
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ) {
    return await this.request<TResponseType>("PATCH", path, options);
  }

  public async delete<TResponseType = unknown>(
    path: string,
    options?: {
      /** Cancel this request, including response reads and retry waits. */
      signal?: AbortSignal | undefined;
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ) {
    return await this.request<TResponseType>("DELETE", path, options);
  }

  protected async request<TResponseType = unknown>(
    method: HttpMethod,
    path: string,
    options?: {
      /** Cancel this request, including response reads and retry waits. */
      signal?: AbortSignal | undefined;
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ): Promise<TResponseType> {
    const cleanedBaseUrl = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;

    const cleanedPath = path.startsWith("/") ? path.slice(1) : path;
    let url = `${cleanedBaseUrl}/${cleanedPath}`;

    if (options?.query && options.query.size > 0) {
      url = `${url}?${options.query.toString()}`;
    }

    const headers = new Headers(this.defaultHeaders());
    // Header names are case-insensitive. Set each layer in precedence order
    // so differently cased overrides replace values instead of combining them.
    for (const layer of [this.authHeaders(), options?.headers]) {
      for (const [name, value] of Object.entries(layer ?? {})) {
        headers.set(name, value);
      }
    }

    const fetchOptions: RequestInit = {
      headers,
      method: method.toUpperCase(),
      body: options?.body,
    };

    // Based on the number of attempts we should make, continue
    // retrying the request. For specified errors, we should
    // retry the request until we have exhausted
    // all attempts.
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      options?.signal?.throwIfAborted();
      const controller = this.timeoutMs > 0 ? new AbortController() : undefined;
      const abortAttempt = () => controller?.abort(options?.signal?.reason);
      if (controller) {
        options?.signal?.addEventListener("abort", abortAttempt, {
          once: true,
        });
      }
      const timer = controller
        ? setTimeout(
            () =>
              controller.abort(
                new DOMException(
                  `Request timed out after ${this.timeoutMs}ms`,
                  "TimeoutError"
                )
              ),
            this.timeoutMs
          )
        : undefined;

      try {
        let resp: Response;

        try {
          resp = await fetch(
            url,
            controller
              ? { ...fetchOptions, signal: controller.signal }
              : { ...fetchOptions, signal: options?.signal }
          );
        } catch (error: unknown) {
          clearTimeout(timer);
          // Caller cancellation never retries, regardless of the fetch error.
          options?.signal?.throwIfAborted();
          // Only fetch failures are eligible for network retries.
          if (error instanceof Error && attempt < this.maxRetries) {
            await this.waitForRetry(attempt, undefined, options?.signal);
            continue;
          }
          throw error;
        }

        options?.signal?.throwIfAborted();
        if (!resp.ok) {
          if (this.shouldRetry(resp.status) && attempt < this.maxRetries) {
            clearTimeout(timer);
            try {
              await resp.body?.cancel();
            } catch {
              // A failed stream cleanup must not prevent the HTTP retry.
            }
            await this.waitForRetry(attempt, resp, options?.signal);
            continue;
          }

          return (await this.handleError(resp)) as TResponseType;
        }

        if (resp.status === 204) {
          const emptyObj = {};
          return emptyObj as TResponseType;
        }

        // A successful operation must not be repeated if reading or parsing
        // its response fails. Keep body handling outside the fetch catch.
        const body = await resp.text();
        options?.signal?.throwIfAborted();

        if (body.length === 0) {
          const emptyObj = {};
          return emptyObj as TResponseType;
        }

        return JSON.parse(body) as TResponseType;
      } catch (error: unknown) {
        // Fetch body streams may report AbortError instead of a custom reason.
        options?.signal?.throwIfAborted();
        throw error;
      } finally {
        clearTimeout(timer);
        if (controller) {
          options?.signal?.removeEventListener("abort", abortAttempt);
        }
      }
    }

    throw new Error("Request failed after all retry attempts");
  }

  private async handleError(resp: Response): Promise<null | never> {
    let detailsString: string;
    let details: unknown;

    // Read once so JSON parsing does not leave an unread cloned stream.
    // Stream failures propagate directly; only invalid JSON falls back to text.
    const body = await resp.text();

    try {
      details = JSON.parse(body);

      if (
        resp.status >= 400 &&
        resp.status < 500 &&
        typeof details === "object" &&
        details !== null &&
        "errors" in details &&
        Array.isArray(details.errors)
      ) {
        detailsString = `Errors: ${details.errors.join(", ")}`;
      } else {
        detailsString = JSON.stringify(details);
      }
    } catch {
      detailsString = body;
      details = detailsString;
    }

    switch (resp.status) {
      case 401:
        throw new ApiError(
          `Authentication failed: Invalid or expired access token. Status: ${resp.status} - ${detailsString}`,
          resp.status,
          details
        );

      case 404:
        return null;

      case 429:
        throw new ApiError(
          `Rate limit exceeded. Status: ${resp.status} - ${detailsString}`,
          resp.status,
          details
        );

      case 422:
        throw new ApiError(
          `Bad data in request. Status: ${resp.status} - ${detailsString}`,
          resp.status,
          details
        );

      case 500:
        throw new ApiError(
          `Internal server error. Status: ${resp.status} - Details: ${detailsString}`,
          resp.status,
          details
        );

      default:
        throw new ApiError(
          `Unknown error. Status: ${resp.status} - Details: ${detailsString}`,
          resp.status,
          details
        );
    }
  }

  /**
   * Determines if a request should be retried based on the HTTP status code.
   *
   * @param statusCode - The HTTP status code to evaluate
   * @returns true if the request should be retried, false otherwise
   */
  private shouldRetry(statusCode: number): boolean {
    return statusCode >= 500 || statusCode === 429;
  }

  private async waitForRetry(
    attempt: number,
    resp?: Response,
    signal?: AbortSignal
  ): Promise<void> {
    let remaining = Math.max(
      this.calculateDelay(attempt),
      this.retryAfterDelay(resp?.headers.get("Retry-After") ?? null)
    );

    // Node turns delays above the signed 32-bit timer limit into 1ms.
    // Split long backoff and server delays to preserve the intended wait.
    const maxTimerDelay = 2 ** 31 - 1;
    while (remaining > maxTimerDelay) {
      await delay(maxTimerDelay, signal);
      remaining -= maxTimerDelay;
    }
    await delay(remaining, signal);
  }

  private retryAfterDelay(header: string | null): number {
    if (header === null) return 0;
    const value = header.trim();
    let milliseconds: number;

    if (/^\d+$/.test(value)) {
      milliseconds = Number(value) * 1000;
    } else {
      // Require an HTTP-date weekday prefix; Date.parse also accepts
      // values such as negative numbers that are not valid Retry-After.
      if (!/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(value)) {
        return 0;
      }
      // The obsolete asctime format has no timezone, but HTTP dates
      // always use GMT. Prevent Date.parse from using the local timezone.
      const date = /^\w{3} \w{3} {1,2}\d{1,2} \d{2}:\d{2}:\d{2} \d{4}$/.test(
        value
      )
        ? `${value} GMT`
        : value;
      milliseconds = Date.parse(date) - Date.now();
    }

    return Number.isSafeInteger(milliseconds) ? Math.max(0, milliseconds) : 0;
  }

  /**
   * Calculates the delay for exponential backoff.
   *
   * @param attempt - The current attempt number (0-based)
   * @returns The delay in milliseconds.
   */
  private calculateDelay(attempt: number): number {
    // Avoid 0 * Infinity at high attempt counts when backoff is disabled.
    if (this.retryDelay === 0) return 0;

    // Exponential backoff: baseDelay * (2 ^ attempt) with some jitter
    const exponentialDelay = this.retryDelay * 2 ** attempt;

    // Add jitter to prevent thundering herd (±12.5% randomization)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);

    const milliseconds = exponentialDelay + jitter;
    // Saturate before waiting so numeric overflow cannot produce NaN,
    // Infinity, or a remaining delay too large to decrement precisely.
    return Number.isFinite(milliseconds)
      ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(milliseconds))
      : Number.MAX_SAFE_INTEGER;
  }

  private getUserAgent(): string {
    return `${this.constructor.name}/JS`;
  }
}

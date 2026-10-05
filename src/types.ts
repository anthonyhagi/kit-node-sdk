export interface ClientOptions {
  /**
   * Per-attempt timeout in milliseconds, including response body reading.
   * Defaults to 0 (disabled). Must be an integer from 0 to 2147483647.
   * Fetch timeouts follow maxRetries; successful response body timeouts
   * throw without repeating the operation. Retry delays are excluded.
   */
  timeoutMs?: number | undefined;

  /**
   * Defaults to `process.env['KIT_API_KEY']`
   */
  apiKey?: string | undefined;

  /**
   * The type of api key you will be using for requests:
   *
   * - `apikey` — this option is used for personal requests for
   * your own account.
   * - `oauth` — this option is used for auth flows that may
   * involve accounts for other users of the platform.
   *
   * If you don't know which one to use, use the `apikey`
   * option.
   */
  authType?: "oauth" | "apikey";

  /**
   * Override the default base URL for the API, e.g., "https://api.example.com/v4"
   *
   * Defaults to "https://api.kit.com/v4".
   */
  baseUrl?: string | null | undefined;

  /**
   * The maximum number of retry attempts for failed requests.
   *
   * Requests will be retried for:
   * - 5xx server errors (transient server issues)
   * - 429 rate limiting responses
   * - Network errors (connection failures, timeouts)
   *
   * Must be a non-negative safe integer; invalid values throw at
   * construction. Set to 0 to disable retries. Defaults to 3.
   * Resource request options can override this; purchases.create() defaults to 0.
   */
  maxRetries?: number;

  /**
   * The base delay in milliseconds for exponential backoff retries.
   *
   * Each retry will wait progressively longer:
   * - 1st retry: ~retryDelay ms
   * - 2nd retry: ~retryDelay * 2 ms
   * - 3rd retry: ~retryDelay * 4 ms
   *
   * Jitter (±12.5%) is added to prevent thundering herd issues.
   *
   * A valid Retry-After response header sets a minimum wait, even
   * when this option is 0. Missing or invalid headers use backoff.
   *
   * Must be a finite non-negative number; invalid values throw at
   * construction. Fractional milliseconds are accepted.
   * Set to 0 to disable backoff. Defaults to 1000 (1 second).
   */
  retryDelay?: number;
}

/** Per-request controls for resource methods. */
export interface RequestOptions {
  /** Override the client retry limit; non-negative safe integer. Purchase creation defaults to 0. */
  maxRetries?: number | undefined;
  /** Cancel the request, including response reads and retry waits. */
  signal?: AbortSignal | undefined;
}

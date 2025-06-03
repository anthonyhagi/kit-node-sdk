export interface ClientOptions {
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
   * Defaults to 3.
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
   * Jitter (±25%) is added to prevent thundering herd issues.
   *
   * Defaults to 1000 (1 second).
   */
  retryDelay?: number;
}

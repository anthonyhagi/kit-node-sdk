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
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | (string & {});

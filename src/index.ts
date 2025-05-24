export interface ClientOptions {
  /**
   * Defaults to `process.env['KIT_API_KEY']`
   */
  apiKey?: string | undefined;

  /**
   * The type of api key you will be using for requests.
   *
   * The `apikey` option is used for personal requests for
   * your own account.
   * The `oauth` option is used for auth flows that may
   * involve accounts for other users of the platform.
   *
   * If you don't know which one to use, use the `apikey`
   * option.
   */
  authType?: "oauth" | "apikey";
}

export class Kit {
  apiKey: string;
  authType: "oauth" | "apikey";

  constructor({ apiKey, authType = "apikey" }: ClientOptions = {}) {
    if (apiKey === undefined) {
      throw new Error(
        "The KIT_API_KEY environment variable is missing or empty. Please provide it, or pass in the `apiKey` option explicitly when initialising this SDK.",
      );
    }

    this.apiKey = apiKey;
    this.authType = authType;
  }
}

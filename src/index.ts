import { AccountsHandler } from "./resources/accounts/handler";

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
  baseURL?: string | null | undefined;
}

export class Kit {
  apiKey: string;
  authType: "oauth" | "apikey";
  baseURL: string;

  /**
   * API Client for interfacing with the Kit API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['KIT_API_KEY'] ?? undefined]
   * @param {ClientOptions['authType']} [opts.authType='apiKey'] - Specify the type of api key you will be using for requests.
   */
  constructor({ apiKey, authType, baseURL }: ClientOptions = {}) {
    if (apiKey === undefined) {
      throw new Error(
        "The KIT_API_KEY environment variable is missing or empty. Please provide it, or pass in the `apiKey` option explicitly when initialising this SDK.",
      );
    }

    this.apiKey = apiKey;
    this.authType = authType || "apikey";
    this.baseURL = baseURL || "https://api.kit.com/v4";
  }

  accounts = new AccountsHandler(this);

  protected authHeaders() {
    if (this.authType === "oauth") {
      return { Authorization: `Bearer ${this.apiKey}` };
    }

    return { "X-Kit-Api-Key": this.apiKey };
  }
}

const kit = new Kit({ apiKey: "" }).accounts;

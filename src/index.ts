import process from "node:process";

import { AccountsHandler } from "~/resources/accounts/handler";
import { BroadcastsHandler } from "~/resources/broadcasts/handler";
import { ApiClient } from "./api-client";
import type {
  GetCreatorProfile,
  GetCurrentAccount,
  GetEmailStats,
  GetGrowthStats,
  GetGrowthStatsParams,
  ListColors,
  UpdateColors,
  UpdateColorsParams,
} from "./resources/accounts/types";
import type { ClientOptions } from "./types";

export class Kit extends ApiClient {
  protected options: Required<ClientOptions>;

  public readonly accounts: AccountsHandler;
  public readonly broadcasts: BroadcastsHandler;

  /**
   * API Client for interfacing with the Kit API.
   *
   * @param {ClientOptions} opts the options to initialise the sdk with.
   * @param {ClientOptions['apiKey']} opts.apiKey The API key to use for
   * all requests.
   * @param {ClientOptions['authType']} opts.authType Specify the type
   * of api key you will be using for requests.
   */
  constructor({
    apiKey = process.env.KIT_API_KEY,
    ...opts
  }: ClientOptions = {}) {
    if (!apiKey || apiKey == null) {
      throw new Error(
        "The KIT_API_KEY environment variable is missing or empty. Please provide it, or pass in the `apiKey` option explicitly when initialising this SDK."
      );
    }

    const options = {
      apiKey,
      authType: opts.authType || "apikey",
      baseUrl: opts.baseUrl || "https://api.kit.com/v4",
    } satisfies ClientOptions;

    super({ baseUrl: options.baseUrl });

    this.options = options;

    this.accounts = new AccountsHandler(this);
    this.broadcasts = new BroadcastsHandler(this);
  }

  /**
   * Generates the appropriate authentication headers based on the
   * configured auth type.
   *
   * @returns {Record<string, string>} The authentication headers.
   */
  protected override authHeaders(): Record<string, string> {
    const authType = this.options.authType;
    const apiKey = this.options.apiKey;

    if (authType === "oauth") {
      return { Authorization: `Bearer ${apiKey}` };
    }

    // Personal api keys follow a different authentication header
    // for all requests. More information can be found here:
    // https://developers.kit.com/v4.html#api-keys
    return { "X-Kit-Api-Key": apiKey };
  }
}

export type {
  ClientOptions,

  // Accounts Types that should be exported.
  GetCreatorProfile,
  GetCurrentAccount,
  GetEmailStats,
  GetGrowthStats,
  GetGrowthStatsParams,
  ListColors,
  UpdateColors,
  UpdateColorsParams,
};

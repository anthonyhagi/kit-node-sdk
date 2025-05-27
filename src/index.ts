import process from "node:process";

import { ApiClient } from "./api-client";
import { AccountsHandler } from "./resources/accounts/handler";
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
import { BroadcastsHandler } from "./resources/broadcasts/handler";
import { CustomFieldsHandler } from "./resources/custom-fields/handler";
import { EmailTemplatesHandler } from "./resources/email-templates/handler";
import { FormsHandler } from "./resources/forms/handler";
import { PurchasesHandler } from "./resources/purchases/handler";
import { SegmentsHandler } from "./resources/segments/handler";
import { SequencesHandler } from "./resources/sequences/handler";
import { SubscribersHandler } from "./resources/subscribers/handler";
import { TagsHandler } from "./resources/tags/handler";
import { WebhooksHandler } from "./resources/webhooks/handler";
import type { ClientOptions } from "./types";

export class Kit extends ApiClient {
  protected options: Required<ClientOptions>;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-accounts}
   */
  public readonly accounts: AccountsHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-broadcasts}
   */
  public readonly broadcasts: BroadcastsHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-custom-fields}
   */
  public readonly customFields: CustomFieldsHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-email-templates}
   */
  public readonly emailTemplates: EmailTemplatesHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-forms}
   */
  public readonly forms: FormsHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-purchases}
   */
  public readonly purchases: PurchasesHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-segments}
   */
  public readonly segments: SegmentsHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-sequences}
   */
  public readonly sequences: SequencesHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-subscribers}
   */
  public readonly subscribers: SubscribersHandler;

  /**
   * Tags are labels you can add to Subscribers to create fixed groups
   * based on a certain shared characteristic.
   *
   * Tags will remain on a subscriber unless they have been intentionally
   * removed (whether manually or through an automated process).
   *
   * Subscribers can have multiple tags. There is no limit to the number
   * of tags a subscriber can be tagged with.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-tags}
   */
  public readonly tags: TagsHandler;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-webhooks}
   */
  public readonly webhooks: WebhooksHandler;

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
    this.customFields = new CustomFieldsHandler(this);
    this.emailTemplates = new EmailTemplatesHandler(this);
    this.forms = new FormsHandler(this);
    this.purchases = new PurchasesHandler(this);
    this.segments = new SegmentsHandler(this);
    this.sequences = new SequencesHandler(this);
    this.subscribers = new SubscribersHandler(this);
    this.tags = new TagsHandler(this);
    this.webhooks = new WebhooksHandler(this);
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

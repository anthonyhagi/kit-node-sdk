import process from "node:process";

import { ApiClient } from "./api-client";
import { AccountsHandler } from "./resources/accounts/handler";
import { BroadcastsHandler } from "./resources/broadcasts/handler";
import { CustomFieldsHandler } from "./resources/custom-fields/handler";
import { EmailTemplatesHandler } from "./resources/email-templates/handler";
import { FormsHandler } from "./resources/forms/handler";
import { PostsHandler } from "./resources/posts/handler";
import { PurchasesHandler } from "./resources/purchases/handler";
import { SegmentsHandler } from "./resources/segments/handler";
import { SequenceEmailsHandler } from "./resources/sequence-emails/handler";
import { SequencesHandler } from "./resources/sequences/handler";
import { SnippetsHandler } from "./resources/snippets/handler";
import { SubscribersHandler } from "./resources/subscribers/handler";
import { TagsHandler } from "./resources/tags/handler";
import { WebhookEndpointsHandler } from "./resources/webhook-endpoints/handler";
import { WebhooksHandler } from "./resources/webhooks/handler";
import type { ClientOptions, RequestOptions } from "./types";

export class Kit extends ApiClient {
  protected options: Required<ClientOptions>;

  /**
   * @see {@link https://developers.kit.com/v4#kit-api-accounts}
   */
  public readonly accounts: AccountsHandler;

  /**
   * One-off, non-automated emails sent to subscribers, publishable
   * as standalone posts.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-broadcasts}
   */
  public readonly broadcasts: BroadcastsHandler;

  /**
   * Additional fields added to subscriber profiles or forms to
   * collect and store extra information.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-custom-fields}
   */
  public readonly customFields: CustomFieldsHandler;

  /**
   * Pre-designed layouts for emails, customizable and reusable for
   * consistent communications.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-email-templates}
   */
  public readonly emailTemplates: EmailTemplatesHandler;

  /**
   * Web forms for collecting subscriber information, such as email
   * addresses, to build email lists.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-forms}
   */
  public readonly forms: FormsHandler;

  /**
   * Content published to the creator's Kit site or sent by email.
   * @see {@link https://developers.kit.com/api-reference/posts/list-posts}
   */
  public readonly posts: PostsHandler;

  /**
   * Transactions for buying products or services through Kit.com,
   * including digital or affiliate sales.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-purchases}
   */
  public readonly purchases: PurchasesHandler;

  /**
   * Dynamic groups of subscribers based on criteria or filters,
   * used for targeted email campaigns.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-segments}
   */
  public readonly segments: SegmentsHandler;

  /**
   * Individual emails within an automated sequence.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/list-sequence-emails}
   */
  public readonly sequenceEmails: SequenceEmailsHandler;

  /**
   * Automated email series sent at predefined intervals, often
   * triggered by actions like form submissions.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-sequences}
   */
  public readonly sequences: SequencesHandler;

  /**
   * Reusable email content referenced by Liquid snippet keys.
   * @see {@link https://developers.kit.com/api-reference/snippets/list-snippets}
   */
  public readonly snippets: SnippetsHandler;

  /**
   * Individuals opted in to receive emails from the creator
   * through Kit.com.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-subscribers}
   */
  public readonly subscribers: SubscribersHandler;

  /**
   * Labels assigned to subscribers for categorization based on
   * attributes or behaviors, for organizing and targeting.
   *
   * Tags will remain on a subscriber unless they have been
   * intentionally removed (whether manually or through an
   * automated process).
   *
   * Subscribers can have multiple tags. There is no limit to the
   * number of tags a subscriber can be tagged with.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-tags}
   */
  public readonly tags: TagsHandler;

  /**
   * Webhook endpoints subscribing to multiple event types with signed deliveries.
   * @see {@link https://developers.kit.com/api-reference/webhooks/list-webhook-endpoints}
   */
  public readonly webhookEndpoints: WebhookEndpointsHandler;

  /**
   * HTTP callbacks for external applications to receive real-time
   * notifications from Kit.com for events like new subscribers.
   *
   * @see {@link https://developers.kit.com/v4#kit-api-webhooks}
   */
  public readonly webhooks: WebhooksHandler;

  /**
   * API Client for interfacing with the Kit API.
   *
   * @param {ClientOptions} opts The options to initialise the sdk
   *   with.
   * @param {ClientOptions['apiKey']} opts.apiKey The API key to use
   *   for all requests.
   * @param {ClientOptions['authType']} opts.authType Specify the
   *   type of api key you will be using for requests.
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
      maxRetries: opts.maxRetries ?? 3,
      retryDelay: opts.retryDelay ?? 1000,
      timeoutMs: opts.timeoutMs ?? 0,
    } satisfies Required<ClientOptions>;

    super({
      baseUrl: options.baseUrl,
      maxRetries: options.maxRetries,
      retryDelay: options.retryDelay,
      timeoutMs: options.timeoutMs,
    });

    this.options = options;

    this.accounts = new AccountsHandler(this);
    this.broadcasts = new BroadcastsHandler(this);
    this.customFields = new CustomFieldsHandler(this);
    this.emailTemplates = new EmailTemplatesHandler(this);
    this.forms = new FormsHandler(this);
    this.posts = new PostsHandler(this);
    this.purchases = new PurchasesHandler(this);
    this.segments = new SegmentsHandler(this);
    this.sequenceEmails = new SequenceEmailsHandler(this);
    this.sequences = new SequencesHandler(this);
    this.snippets = new SnippetsHandler(this);
    this.subscribers = new SubscribersHandler(this);
    this.tags = new TagsHandler(this);
    this.webhookEndpoints = new WebhookEndpointsHandler(this);
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

export { ApiError } from "./errors";
export {
  buildOAuthAuthorizationUrl,
  exchangeOAuthCode,
  generateOAuthPKCE,
  refreshOAuthToken,
  revokeOAuthToken,
} from "./oauth";
export { verifyWebhookSignature } from "./webhook-signature";
export type {
  BuildOAuthAuthorizationUrlOptions,
  BuildOAuthAuthorizationUrlParams,
  ExchangeOAuthCodeOptions,
  ExchangeOAuthCodeParams,
  OAuthPKCE,
  OAuthTokenResponse,
  RefreshOAuthTokenOptions,
  RefreshOAuthTokenParams,
  RevokeOAuthTokenOptions,
  RevokeOAuthTokenParams,
} from "./oauth";
export type {
  AccountEmailStats,
  AccountGrowthStats,
  GetCreatorProfile,
  GetCurrentAccount,
  GetEmailStats,
  GetGrowthStats,
  GetGrowthStatsParams,
  ListColors,
  UpdateColors,
  UpdateColorsParams,
} from "./resources/accounts/types";
export type { ClientOptions, RequestOptions };

export type {
  BasicSubscriberFilterItem,
  Broadcast,
  BroadcastEmailTemplate,
  BroadcastLinkClick,
  BroadcastListItem,
  BroadcastStats,
  BroadcastStatus,
  BroadcastSubscriberFilterGroup,
  BroadcastSubscriberFilterResponseGroup,
  BroadcastSubscriberFilterResponseItem,
  CreateBroadcast,
  CreateBroadcastParams,
  GetBroadcast,
  GetBroadcastStats,
  GetBroadcastStatsParams,
  GetLinkClicks,
  GetLinkClicksParams,
  GetSingleBroadcastStats,
  ListBroadcasts,
  ListBroadcastsParams,
  ListSlimBroadcasts,
  TypedSubscriberFilterItem,
  UpdateBroadcast,
  UpdateBroadcastParams,
} from "./resources/broadcasts/types";

export type {
  BulkCreate,
  BulkCreateAsynchronous,
  BulkCreateCallback,
  BulkCreatedCustomField,
  BulkCreateParams,
  BulkCreateSynchronous,
  BulkCreateWithoutResponseType,
  BulkUpdateSubscriberValues,
  BulkUpdateSubscriberValuesAsynchronous,
  BulkUpdateSubscriberValuesCallback,
  BulkUpdateSubscriberValuesParams,
  BulkUpdateSubscriberValuesSynchronous,
  BulkUpdateSubscriberValuesWithoutResponseType,
  CreateCustomField,
  CreateCustomFieldParams,
  CustomField,
  ListCustomFields,
  ListCustomFieldsParams,
  UpdateCustomField,
  UpdateCustomFieldParams,
} from "./resources/custom-fields/types";

export type {
  EmailTemplate,
  ListEmailTemplates,
  ListEmailTemplatesParams,
} from "./resources/email-templates/types";

export type {
  AddSubscriberToForm,
  AddSubscriberToFormByEmail,
  AddSubscriberToFormByEmailParams,
  AddSubscriberToFormParams,
  BulkAddSubscribers,
  BulkAddSubscribersAsynchronous,
  BulkAddSubscribersCallback,
  BulkAddSubscribersParams,
  BulkAddSubscribersSynchronous,
  BulkAddSubscribersWithoutResponseType,
  Form,
  FormReferrerUtmParameters,
  FormSubscriber,
  ListForms,
  ListFormsParams,
  ListFormSubscribers,
  ListFormSubscribersParams,
  ListSlimFormSubscribers,
} from "./resources/forms/types";

export type {
  GetPost,
  ListPosts,
  ListPostsParams,
  ListPostsWithContent,
  Post,
  PostListItem,
} from "./resources/posts/types";

export type {
  CreatePurchase,
  CreatePurchaseParams,
  GetPurchase,
  ListPurchases,
  ListPurchasesParams,
  Purchase,
  PurchaseProduct,
} from "./resources/purchases/types";

export type {
  ListSegments,
  ListSegmentsParams,
  Segment,
} from "./resources/segments/types";

export type {
  CreateSequenceEmail,
  CreateSequenceEmailParams,
  GetSequenceEmail,
  GetSequenceEmailParams,
  GetSequenceEmailWithStats,
  ListSequenceEmails,
  ListSequenceEmailsParams,
  ListSequenceEmailsWithContent,
  ListSequenceEmailsWithContentAndStats,
  ListSequenceEmailsWithStats,
  SequenceEmail,
  SequenceEmailListItem,
  SequenceEmailStats,
  UpdateSequenceEmail,
  UpdateSequenceEmailParams,
} from "./resources/sequence-emails/types";

export type {
  AddSubscriberByEmailParams,
  AddSubscriberToSequence,
  CreateSequence,
  CreateSequenceParams,
  GetSequence,
  GetSequenceParams,
  GetSequenceWithStats,
  ListSequences,
  ListSequencesParams,
  ListSequenceSubscribers,
  ListSequenceSubscribersParams,
  ListSequencesWithStats,
  Sequence,
  SequenceListItem,
  SequenceSendDay,
  SequenceStats,
  SequenceSubscriber,
  UpdateSequence,
  UpdateSequenceParams,
} from "./resources/sequences/types";

export type {
  CreateSnippet,
  CreateSnippetParams,
  GetSnippet,
  ListSnippets,
  ListSnippetsParams,
  ListSnippetsWithContent,
  Snippet,
  SnippetDocument,
  SnippetListItem,
  SnippetType,
  UpdateSnippet,
  UpdateSnippetParams,
} from "./resources/snippets/types";

export type {
  BulkCreateSubscribers,
  BulkCreateSubscribersAsynchronous,
  BulkCreateSubscribersCallback,
  BulkCreateSubscribersParams,
  BulkCreateSubscribersSynchronous,
  CreateSubscriber,
  CreateSubscriberParams,
  FilterSubscriberBody,
  FilterSubscriberBodyAllAttribution,
  FilterSubscriberBodyAllBase,
  FilterSubscriberBodyAllCustomField,
  FilterSubscriberBodyAllLocation,
  FilterSubscriberBodyAllState,
  FilterSubscriberBodyAllSubscribed,
  FilterSubscriberBodyAllTags,
  FilterSubscriberBodyAnyBroadcast,
  FilterSubscriberBodyAnyForms,
  FilterSubscriberBodyAnyKitSource,
  FilterSubscriberBodyAnyUrls,
  FilterSubscriberInclude,
  FilterSubscriberParams,
  FilterSubscribers,
  GetSubscriber,
  GetSubscriberStats,
  GetSubscriberStatsParams,
  GetSubscriberTags,
  GetSubscriberTagsParams,
  ListFullSubscribers,
  ListSlimSubscribers,
  ListSubscribers,
  ListSubscribersParams,
  PinSubscriberLocation,
  PinSubscriberLocationParams,
  Subscriber,
  SubscriberLocation,
  UpdateSubscriber,
  UpdateSubscriberLocation,
  UpdateSubscriberLocationParams,
  UpdateSubscriberParams,
} from "./resources/subscribers/types";

export type {
  BulkCreateTags,
  BulkCreateTagsAsynchronous,
  BulkCreateTagsCallback,
  BulkCreateTagsParams,
  BulkCreateTagsSynchronous,
  BulkDeleteTags,
  BulkDeleteTagsAsynchronous,
  BulkDeleteTagsCallback,
  BulkDeleteTagsParams,
  BulkDeleteTagsSynchronous,
  BulkRemoveTags,
  BulkRemoveTagsAsynchronous,
  BulkRemoveTagsCallback,
  BulkRemoveTagsParams,
  BulkRemoveTagsSynchronous,
  BulkTag,
  BulkTagAsynchronous,
  BulkTagCallback,
  BulkTagParams,
  BulkTagSynchronous,
  CreateTag,
  CreateTagParams,
  ListSlimTagSubscribers,
  ListTags,
  ListTagsParams,
  ListTagSubscribers,
  ListTagSubscribersParams,
  RemoveSubscriberByEmailParams,
  Tag,
  TaggedSubscriber,
  Tagging,
  TagSubscriber,
  TagSubscriberByEmail,
  TagSubscriberByEmailParams,
  UpdateTag,
  UpdateTagParams,
} from "./resources/tags/types";

export type {
  CreateWebhookEndpoint,
  CreateWebhookEndpointParams,
  GetWebhookEndpoint,
  ListWebhookEndpoints,
  ListWebhookEndpointsParams,
  RevokePreviousWebhookEndpointSecret,
  RotateWebhookEndpointSecret,
  RotateWebhookEndpointSecretParams,
  UpdateWebhookEndpoint,
  UpdateWebhookEndpointParams,
  WebhookEndpoint,
  WebhookEndpointStatus,
} from "./resources/webhook-endpoints/types";

export type {
  CreateWebhook,
  CreateWebhookParams,
  ListWebhooks,
  ListWebhooksParams,
  Webhook,
  WebhookEvent,
  WebhookEventResponse,
} from "./resources/webhooks/types";

export type {
  WebhookBroadcast,
  WebhookCustomField,
  WebhookDelivery,
  WebhookDeliveryEvent,
  WebhookEndpointEventType,
  WebhookEventDataMap,
  WebhookForm,
  WebhookPost,
  WebhookSequence,
  WebhookSubscriber,
} from "./webhook-delivery";

export type { VerifyWebhookSignatureOptions } from "./webhook-signature";

import {
  ApiError,
  generateOAuthPKCE,
  Kit,
  refreshOAuthToken,
  verifyWebhookSignature,
  type Account,
  type AccountEmailStats,
  type AccountGrowthStats,
  type AccountPlan,
  type AccountSendingAddress,
  type AccountTimezone,
  type AccountUser,
  type Broadcast,
  type BroadcastListItem,
  type CreateWebhook,
  type CreatorProfile,
  type EmailTemplate,
  type FilterSubscribers,
  type Form,
  type GetBroadcast,
  type GetCreatorProfile,
  type GetCurrentAccount,
  type GetEmailStats,
  type GetGrowthStats,
  type GetPost,
  type GetSequence,
  type GetSequenceEmail,
  type GetSequenceEmailWithStats,
  type GetSequenceWithStats,
  type GetSnippet,
  type GetSubscriber,
  type GetSubscriberStats,
  type GetSubscriberTags,
  type ListBroadcasts,
  type ListEmailTemplates,
  type ListForms,
  type ListPostsWithContent,
  type ListSegments,
  type ListSequenceEmailsWithContent,
  type ListSequenceEmailsWithContentAndStats,
  type ListSequencesWithStats,
  type ListSnippetsWithContent,
  type ListSubscribers,
  type ListWebhooks,
  type OAuthPKCE,
  type OAuthTokenResponse,
  type Post,
  type RequestOptions,
  type Segment,
  type Sequence,
  type SequenceEmail,
  type Snippet,
  type SubscriberStats,
  type SubscriberTag,
  type UpdateBroadcast,
  type Webhook,
  type WebhookDelivery,
  type WebhookEventResponse,
} from "@anthonyhagi/kit-node-sdk";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

export type SequenceResponse = Assert<Equal<GetSequence["sequence"], Sequence>>;
export type SequenceEmailResponse = Assert<
  Equal<GetSequenceEmail["email"], SequenceEmail>
>;
export type SequenceEmailContentList = Assert<
  Equal<ListSequenceEmailsWithContent["emails"][number], SequenceEmail>
>;

export type SnippetResponse = Assert<Equal<GetSnippet["snippet"], Snippet>>;
export type SnippetContentList = Assert<
  Equal<ListSnippetsWithContent["snippets"][number], Snippet>
>;

export type PostResponse = Assert<Equal<GetPost["post"], Post>>;
export type PostContentList = Assert<
  Equal<ListPostsWithContent["posts"][number], Post>
>;

export type BroadcastResponse = Assert<
  Equal<GetBroadcast["broadcast"], Broadcast>
>;
export type BroadcastUpdateResponse = Assert<
  Equal<UpdateBroadcast["broadcast"], Broadcast>
>;
export type BroadcastListResponse = Assert<
  Equal<ListBroadcasts["broadcasts"][number], BroadcastListItem>
>;

export type EmailTemplateListResponse = Assert<
  Equal<ListEmailTemplates["email_templates"][number], EmailTemplate>
>;
export type SegmentListResponse = Assert<
  Equal<ListSegments["segments"][number], Segment>
>;

export type FormListResponse = Assert<Equal<ListForms["forms"][number], Form>>;

export type WebhookListResponse = Assert<
  Equal<ListWebhooks["webhooks"][number], Webhook>
>;
export type WebhookListedEvent = Assert<
  Equal<Webhook["event"], WebhookEventResponse>
>;
export type WebhookCreatedEventKeys = Assert<
  Equal<keyof CreateWebhook["webhook"]["event"], "name" | "initiator_value">
>;
export type WebhookCreatedInitiator = Assert<
  Equal<CreateWebhook["webhook"]["event"]["initiator_value"], string | null>
>;

export type AccountEmailStatsResponse = Assert<
  Equal<GetEmailStats["stats"], AccountEmailStats>
>;
export type AccountGrowthStatsResponse = Assert<
  Equal<GetGrowthStats["stats"], AccountGrowthStats>
>;

export type CurrentAccountResponse = Assert<
  Equal<GetCurrentAccount["account"], Account>
>;
export type CurrentAccountUserResponse = Assert<
  Equal<GetCurrentAccount["user"], AccountUser>
>;
export type CreatorProfileResponse = Assert<
  Equal<GetCreatorProfile["profile"], CreatorProfile>
>;

export type SubscriberStatsResponse = Assert<
  Equal<GetSubscriberStats["subscriber"]["stats"], SubscriberStats>
>;
export type FilteredSubscriberLastSent = Assert<
  Equal<
    NonNullable<FilterSubscribers["subscribers"][number]["stats"]>["last_sent"],
    string | null | undefined
  >
>;

export type AccountPlanResponse = Assert<
  Equal<Account["plan"], AccountPlan | undefined>
>;
export type AccountSendingAddressesResponse = Assert<
  Equal<Account["sending_addresses"], AccountSendingAddress[] | undefined>
>;
export type AccountTimezoneResponse = Assert<
  Equal<Account["timezone"], AccountTimezone>
>;

export type SubscriberTagResponse = Assert<
  Equal<GetSubscriberTags["tags"][number], SubscriberTag>
>;
export type SubscriberTagKeys = Assert<
  Equal<keyof SubscriberTag, "id" | "name" | "added_at" | "tagged_at">
>;

const kit = new Kit({ apiKey: "typecheck-only", maxRetries: 0 });
const options = {
  signal: new AbortController().signal,
} satisfies RequestOptions;
export const subscriber = kit.subscribers.get(1, options);
export const subscribers = kit.subscribers.list(
  { slim: true, after: null, per_page: 25 },
  options
);
export const snippets = kit.snippets.list({ include_content: true }, options);
export type SnippetsResult = Assert<
  Equal<typeof snippets, Promise<ListSnippetsWithContent>>
>;
export function snippetContent(page: ListSnippetsWithContent): string[] {
  return page.snippets.map(
    (snippet) => snippet.content + snippet.document.value_html
  );
}

export const posts = kit.posts.list({ include_content: true }, options);
export type PostsResult = Assert<
  Equal<typeof posts, Promise<ListPostsWithContent>>
>;
export function postContent(page: ListPostsWithContent): string[] {
  return page.posts.map((post) => post.content);
}

export const sequenceEmails = kit.sequenceEmails.list(
  108,
  { include_content: true },
  options
);
export type SequenceEmailsResult = Assert<
  Equal<typeof sequenceEmails, Promise<ListSequenceEmailsWithContent | null>>
>;
export function sequenceEmailContent(
  page: ListSequenceEmailsWithContent | null
): (string | null)[] {
  return page?.emails.map((email) => email.content) ?? [];
}

export const sequencesWithStats = kit.sequences.list(
  { include: "stats" },
  options
);
export const sequenceWithStats = kit.sequences.get(
  123,
  { include: "stats" },
  options
);
export type SequencesStatsResult = Assert<
  Equal<typeof sequencesWithStats, Promise<ListSequencesWithStats>>
>;
export type SequenceStatsResult = Assert<
  Equal<typeof sequenceWithStats, Promise<GetSequenceWithStats | null>>
>;
export function sequenceOpenRates(
  page: ListSequencesWithStats
): (number | null | undefined)[] {
  return page.sequences.map((sequence) => sequence.stats.open_rate);
}

export const emailWithStats = kit.sequenceEmails.get(
  123,
  456,
  { include: "stats" },
  options
);
export const emailsWithContentAndStats = kit.sequenceEmails.list(
  123,
  { include: "stats", include_content: true },
  options
);
export type EmailStatsResult = Assert<
  Equal<typeof emailWithStats, Promise<GetSequenceEmailWithStats | null>>
>;
export type EmailContentStatsResult = Assert<
  Equal<
    typeof emailsWithContentAndStats,
    Promise<ListSequenceEmailsWithContentAndStats | null>
  >
>;
export function emailStatsContent(
  page: ListSequenceEmailsWithContentAndStats | null
): (string | null)[] {
  return (
    page?.emails.map((email) => {
      const stats = email.stats;
      return stats.open_rate === 0 ? email.content : null;
    }) ?? []
  );
}

export const pkce = generateOAuthPKCE();
export const tokens = refreshOAuthToken(
  { client_id: "typecheck-only", refresh_token: "typecheck-only" },
  options
);
export const error = new ApiError("typecheck-only", 401, { errors: [] });
export const signature = verifyWebhookSignature(
  new Uint8Array(),
  null,
  "typecheck-only"
);

export type SubscriberResult = Assert<
  Equal<typeof subscriber, Promise<GetSubscriber | null>>
>;
export type ListResult = Assert<
  typeof subscribers extends Promise<ListSubscribers> ? true : false
>;
export type PKCEResult = Assert<Equal<typeof pkce, OAuthPKCE>>;
export type TokenResult = Assert<
  Equal<typeof tokens, Promise<OAuthTokenResponse>>
>;
export type ErrorStatus = Assert<Equal<typeof error.status, number>>;
export type SignatureResult = Assert<Equal<typeof signature, boolean>>;

export function webhookSubscriberId(
  delivery: WebhookDelivery<"subscriber.created">
): number | undefined {
  return delivery.events[0]?.data.subscriber.id;
}

export function invalidInputs() {
  // @ts-expect-error Subscriber IDs must be numeric.
  kit.subscribers.get("invalid");
  // @ts-expect-error Page sizes must be numeric or null.
  kit.subscribers.list({ per_page: "invalid" });
  // @ts-expect-error Cancellation requires an AbortSignal.
  kit.subscribers.list({}, { signal: "invalid" });
}

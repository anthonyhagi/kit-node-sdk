import {
  ApiError,
  generateOAuthPKCE,
  Kit,
  refreshOAuthToken,
  verifyWebhookSignature,
  type GetSubscriber,
  type ListSubscribers,
  type OAuthPKCE,
  type OAuthTokenResponse,
  type RequestOptions,
  type WebhookDelivery,
} from "@anthonyhagi/kit-node-sdk";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

const kit = new Kit({ apiKey: "typecheck-only", maxRetries: 0 });
const options = {
  signal: new AbortController().signal,
} satisfies RequestOptions;
export const subscriber = kit.subscribers.get(1, options);
export const subscribers = kit.subscribers.list(
  { slim: true, after: null, per_page: 25 },
  options
);
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

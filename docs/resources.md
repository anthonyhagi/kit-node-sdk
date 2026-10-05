# API resources

[Documentation index](README.md) · [Project overview](../README.md)

The SDK is structured to mirror the [Kit.com API v4](https://developers.kit.com/v4) endpoints. Each resource is accessible through the main `Kit` instance:

## Available Resources

| Resource                   | Description                                                        | Key Methods                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **`kit.accounts`**         | Account and user information, creator profiles, email/growth stats | `getCurrentAccount()`, `getEmailStats()`, `getGrowthStats()`                                                                |
| **`kit.broadcasts`**       | One-off emails sent to subscribers                                 | `list()`, `create()`, `update()`, `getStats()`                                                                              |
| **`kit.customFields`**     | Additional fields for subscriber profiles and forms                | `list()`, `create()`, `update()`, `bulkCreate()`, `bulkUpdateSubscriberValues()`                                            |
| **`kit.emailTemplates`**   | Pre-designed email layouts                                         | `list()`                                                                                                                    |
| **`kit.forms`**            | Web forms for collecting subscriber information                    | `list()`, `addSubscriber()`, `addSubscriberByEmail()`, `listSubscribers()`                                                  |
| **`kit.posts`**            | Content published to the creator’s Kit site or sent by email       | `list()`, `get()`                                                                                                           |
| **`kit.purchases`**        | Transaction records for products/services                          | `list()`, `create()`, `get()`                                                                                               |
| **`kit.segments`**         | Dynamic subscriber groups based on criteria                        | `list()`                                                                                                                    |
| **`kit.sequenceEmails`**   | Individual emails inside automated sequences                       | `list()`, `get()`, `create()`, `update()`, `delete()`                                                                       |
| **`kit.sequences`**        | Automated email series                                             | `list()`, `get()`, `create()`, `update()`, `delete()`, `addSubscriberById()`, `addSubscriberByEmail()`, `listSubscribers()` |
| **`kit.snippets`**         | Reusable email content referenced by Liquid keys                   | `list()`, `get()`, `create()`, `update()`                                                                                   |
| **`kit.subscribers`**      | Individual email recipients                                        | `list()`, `create()`, `get()`, `update()`, `bulkCreate()`, `getTags()`                                                      |
| **`kit.tags`**             | Labels for categorizing subscribers                                | `list()`, `create()`, `update()`, `bulkCreate()`, `tagSubscriber()`, `listSubscribers()`                                    |
| **`kit.webhookEndpoints`** | Webhook endpoints with multiple events and signed deliveries       | `list()`, `get()`, `create()`, `update()`, `delete()`, `rotateSecret()`, `revokePreviousSecret()`                           |
| **`kit.webhooks`**         | HTTP callbacks for real-time notifications                         | `list()`, `create()`                                                                                                        |

See [Examples](examples.md) for subscriber, tag, form, and sequence operations.

## Email stats retention

Starting **October 15, 2026**, Kit makes email stats available through the API
for a rolling **five-year (60-month)** window. This covers sends, opens, clicks,
bounces, and unsubscribes; subscriber records, tags, custom fields, purchases,
and broadcast content are unaffected.

| SDK method                                     | Retention behavior                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `kit.broadcasts.getStats(id)`                  | Stats for broadcasts sent before the window return HTTP 400.                                               |
| `kit.broadcasts.getAllStats(params)`           | Broadcasts sent before the window are omitted.                                                             |
| `kit.broadcasts.getLinkClicksById(id, params)` | Click data older than the window is unavailable.                                                           |
| `kit.subscribers.getStats(id, params)`         | Date parameters are clamped to the window; dates outside it return HTTP 400.                               |
| `kit.subscribers.filter(body, params)`         | Engagement-condition date bounds are clamped; a `stats` include range outside the window returns HTTP 400. |

See [retention errors](error-handling.md#email-stats-retention-errors) for SDK
error handling and [Kit's retention policy](https://developers.kit.com/api-reference/email-data-retention)
for details. Applications maintaining longer histories should sync stats before
they age out of the window.

## Account sending addresses and plan details

`kit.accounts.getCurrentAccount()` exposes optional `user.id`,
`account.sending_addresses`, and `account.plan` in the exported
`GetCurrentAccount` response type. Sending addresses include the sender name,
status, default flag, verification flag, and DMARC configuration flag. Plan
information includes the billing interval, subscriber limit, trial flag, and
nullable trial, renewal, and cancellation dates.

```ts
const result = await kit.accounts.getCurrentAccount();
for (const address of result.account.sending_addresses ?? []) {
  console.log(
    address.email_address,
    address.is_verified,
    address.is_dmarc_configured
  );
}
console.log(result.account.plan?.renews_at);
```

These fields can be omitted; plan dates can be `null` when not applicable.
See the [Kit API reference](https://developers.kit.com/api-reference/accounts/get-current-account).

## Nullable referrer when adding a form subscriber by email

`kit.forms.addSubscriberByEmail()` accepts a string, `URL`, or `null` for
`referrer`. The exported `AddSubscriberToFormByEmailParams` type includes these
values. Supplied values, including `null` and an empty string, are sent as-is;
an omitted or `undefined` referrer is left out of the JSON body. `URL` objects
serialize to their URL string.

```ts
await kit.forms.addSubscriberByEmail(7, {
  email_address: "ada@example.com",
  referrer: null,
});
```

The subscriber must already exist. See
[Kit's endpoint reference](https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address).

## Slim form subscriber lists

Pass `slim: true` to `kit.forms.listSubscribers()` for a faster, smaller response:

```ts
const result = await kit.forms.listSubscribers(7, { slim: true, per_page: 25 });
for (const subscriber of result?.subscribers ?? []) {
  console.log(subscriber.email_address, subscriber.fields?.category);
}
```

`slim: true` returns `ListSlimFormSubscribers | null`. Custom fields and form
subscription metadata (`added_at`, `referrer`, and `referrer_utm_parameters`)
are optional in this type because Kit describes a reduced response without
specifying every omitted field. Passing `slim: false` or omitting the option
retains `ListFormSubscribers | null`; a dynamic boolean returns the union.
Explicit false is sent to Kit, and undefined is omitted. Pagination and filters
can be combined with slim; missing forms return `null`.
See the [Kit API reference](https://developers.kit.com/api-reference/forms/list-subscribers-for-a-form).

## Bulk completion callbacks

Large bulk requests are queued. When you provide `callback_url`, Kit posts the
completed result to that URL using the endpoint's synchronous response shape.
The SDK adds `type: "synchronous"` or `type: "asynchronous"` to direct method
results; Kit's callback body has neither discriminator.

Use the exported callback type for your operation:

| SDK method                                      | Callback payload type                |
| ----------------------------------------------- | ------------------------------------ |
| `kit.subscribers.bulkCreate()`                  | `BulkCreateSubscribersCallback`      |
| `kit.forms.bulkAddSubscribers()`                | `BulkAddSubscribersCallback`         |
| `kit.customFields.bulkCreate()`                 | `BulkCreateCallback`                 |
| `kit.customFields.bulkUpdateSubscriberValues()` | `BulkUpdateSubscriberValuesCallback` |
| `kit.tags.bulkCreate()`                         | `BulkCreateTagsCallback`             |
| `kit.tags.bulkDelete()`                         | `BulkDeleteTagsCallback`             |
| `kit.tags.bulkRemove()`                         | `BulkRemoveTagsCallback`             |
| `kit.tags.bulkTag()`                            | `BulkTagCallback`                    |

For example, a callback receiver for bulk subscriber creation can handle
successful records and per-subscriber failures:

```ts
import type { BulkCreateSubscribersCallback } from "@anthonyhagi/kit-node-sdk";

async function receiveBulkSubscribers(request: Request) {
  const result = (await request.json()) as BulkCreateSubscribersCallback;
  for (const subscriber of result.subscribers) {
    console.log("Created subscriber", subscriber.id);
  }
  for (const failure of result.failures) {
    console.error(failure.subscriber.email_address, failure.errors);
  }
  return new Response(null, { status: 204 });
}
```

These are TypeScript types, not runtime validators. A queued acknowledgement
contains no completion results; wait for the callback and inspect `failures`
even when the bulk request was accepted. These bulk completion callbacks are
separate from signed webhook endpoint deliveries.
See [Kit's bulk processing guide](https://developers.kit.com/api-reference/bulk-and-async-processing).

## Updating subscriber custom-field values in bulk

Use `kit.customFields.bulkUpdateSubscriberValues()` with an OAuth client. The
custom fields must already exist. Each entry pairs a subscriber ID with the
custom field's `subscriber_custom_field_id` and a string value:

```ts
const kit = new Kit({ apiKey: accessToken, authType: "oauth" });
const result = await kit.customFields.bulkUpdateSubscriberValues({
  custom_field_values: [
    { subscriber_id: 622, subscriber_custom_field_id: 157, value: "Smith" },
  ],
  callback_url: null,
});
if (result.type === "synchronous") {
  console.log(result.custom_field_values, result.failures);
}
```

`callback_url` is required; pass `null` when no callback is needed. Up to 100
values are processed synchronously, with successful values and per-entry
failures. More than 100 values are processed asynchronously; provide a callback
URL to receive completion results. Invalid subscribers or custom fields can fail
individually while other entries succeed. API errors, including the `413` queued
bulk-request limit and `422` invalid batch response, throw.

Exported types include `BulkUpdateSubscriberValuesParams`,
`BulkUpdateSubscriberValues`, `BulkUpdateSubscriberValuesSynchronous`, and
`BulkUpdateSubscriberValuesAsynchronous`. Narrow on `result.type` before reading
values or failures.
See the [Kit API reference](https://developers.kit.com/api-reference/custom-fields/bulk-update-subscriber-custom-field-values).

## Including tag subscriber counts

Pass `include: "subscriber_count"` to `kit.tags.list()` to request the number
of active subscribers with each tag:

```ts
const result = await kit.tags.list({ include: "subscriber_count" });
for (const tag of result.tags) {
  console.log(tag.name, tag.subscriber_count);
}
```

The exported `ListTagsParams` type accepts this include option, and `ListTags`
exposes `subscriber_count` as an optional number. A tag can have a count of zero;
responses without the include option can omit it. This per-tag count is separate
from `include_total_count`, which requests the number of tags for pagination.
See the [Kit API reference](https://developers.kit.com/api-reference/tags/list-tags).

## Including form subscriber counts

Pass `include: "subscriber_count"` to `kit.forms.list()` to request the number
of active subscribers who subscribed via each form:

```ts
const result = await kit.forms.list({ include: "subscriber_count" });
for (const form of result.forms) {
  console.log(form.name, form.subscriber_count);
}
```

The exported `ListFormsParams` type accepts this include option, and `ListForms`
exposes `subscriber_count` as an optional number. A form can have a count of zero;
responses without the include option can omit it. This per-form count is separate
from `include_total_count`, which requests the number of forms for pagination.
See the [Kit API reference](https://developers.kit.com/api-reference/forms/list-forms).

## Custom-field events for legacy webhooks

`kit.webhooks.create()` supports `custom_field.field_created`,
`custom_field.field_deleted`, and `custom_field.field_value_updated`. Value-update
subscriptions require the numeric `custom_field_id` of the field to watch:

```ts
await kit.webhooks.create({
  target_url: "https://example.com/hooks/kit",
  event: {
    name: "custom_field.field_value_updated",
    custom_field_id: 11,
  },
});
```

Field-created and field-deleted subscriptions need only their event name.
The exported `WebhookEvent` type includes these events and retains support for
future event names. Kit validates event configuration when creating the webhook.
For new integrations, use `kit.webhookEndpoints`; these event names belong to
the legacy webhook API.
See the [Kit API reference](https://developers.kit.com/api-reference/webhooks-legacy/create-a-webhook).

## Verifying webhook endpoint deliveries

Use the exported `verifyWebhookSignature()` before parsing or processing a
webhook endpoint delivery. Pass the exact raw body, the `X-Kit-Signature` header,
and the secret saved when creating or rotating the endpoint:

```ts
import {
  verifyWebhookSignature,
  type WebhookDelivery,
} from "@anthonyhagi/kit-node-sdk";

async function receiveKitWebhook(request: Request, signingSecret: string) {
  const rawBody = new Uint8Array(await request.arrayBuffer());
  const valid = verifyWebhookSignature(
    rawBody,
    request.headers.get("X-Kit-Signature"),
    signingSecret
  );
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const delivery: WebhookDelivery = JSON.parse(
    new TextDecoder().decode(rawBody)
  );
  for (const event of delivery.events) {
    // Deduplicate by event.id before applying your application logic.
    if (event.type === "subscriber.tag_added") {
      // The event type narrows data to subscriber and tag.
      console.log(event.id, event.data.subscriber.id, event.data.tag.id);
    }
  }
  return new Response(null, { status: 204 });
}
```

The helper accepts a string or `Uint8Array` (including Node.js `Buffer`), checks
HMAC-SHA256 with constant-time comparisons, and accepts any matching `v1`
signature during secret rotation. Missing or malformed headers, invalid
signatures, empty secrets, and timestamps more than 300 seconds in the past or
future return `false`. Pass `{ toleranceSeconds: 60 }` as the fourth argument to
customize the clock tolerance; a negative or non-finite tolerance throws
`RangeError`. `VerifyWebhookSignatureOptions` is also exported.

Capture the raw body before any JSON middleware changes it. Re-serializing a
parsed payload can change its bytes and invalidate the signature. Verification
does not deduplicate events: a retry or re-emission can deliver the same event
again, so deduplicate using each event's `id`, rather than `delivery_id`.
See [Kit's signature protocol](https://developers.kit.com/webhooks/verifying-signatures)
and [delivery format](https://developers.kit.com/webhooks/delivery-format).

## Webhook delivery types

`WebhookDelivery` represents the signed delivery envelope, and
`WebhookDeliveryEvent` is a discriminated union of the 23 currently available
webhook endpoint events. Checking `event.type` narrows `event.data` to the
subscriber and related resource, or the resource summary for resource events.
`WebhookEventDataMap` maps event names to payloads; `WebhookEndpointEventType`
is its event-name union. These are separate from the legacy `WebhookEvent` type.

For an endpoint handling a specific event, use
`WebhookDelivery<"subscriber.tag_added">` or
`WebhookDeliveryEvent<"subscriber.tag_added">`. The exported resource payload
types are `WebhookSubscriber`, `WebhookForm`, `WebhookSequence`,
`WebhookCustomField`, `WebhookBroadcast`, and `WebhookPost`. Broadcast and post
payloads contain summaries, so fetch the full API record for content.

These are TypeScript types, not runtime validators. Verify the signature before
parsing, and validate incoming JSON if your application requires schema checks.
The event union covers shipped events; planned and future event payloads are
not modeled. Endpoint subscription parameters continue to accept strings.
See [Kit's event payloads](https://developers.kit.com/webhooks/event-types).

## Revoking the previous webhook endpoint secret

After switching your receiver to a rotated signing secret, call
`kit.webhookEndpoints.revokePreviousSecret(id)` to close the overlap window early.
The previous secret immediately stops verifying, and subsequent deliveries are
signed only with the current secret.

```ts
const result = await kit.webhookEndpoints.revokePreviousSecret(2);
if (result) {
  console.log(result.webhook_endpoint.previous_secret_expires_at); // null
}
```

The exported `RevokePreviousWebhookEndpointSecret` response contains endpoint
metadata with `previous_secret_expires_at: null` and no signing secret. Missing
endpoints return `null`; API errors throw.
See the [Kit API reference](https://developers.kit.com/api-reference/webhooks/revoke-the-previous-webhook-endpoint-secret).

## Rotating a webhook endpoint secret

`kit.webhookEndpoints.rotateSecret(id, params)` generates a new signing secret
and returns the expiry timestamp for the previous secret's overlap window.

```ts
const result = await kit.webhookEndpoints.rotateSecret(2);
if (result) {
  const signingSecret = result.webhook_endpoint.secret;
  // Save signingSecret securely and use it for signature verification.
  console.log(result.webhook_endpoint.previous_secret_expires_at);
}
```

Save the new secret from this response; list/get responses do not expose it.
During the overlap window, deliveries are signed with both secrets. Rotating
again while the window is open throws a `409` conflict. Passing `{ force: true }`
rotates anyway and immediately expires the older secret. The SDK sends force
only when supplied and leaves conflict handling to the caller.

Exported types are `RotateWebhookEndpointSecretParams` and
`RotateWebhookEndpointSecret`. The response requires both the new secret and a
string expiry timestamp. Missing endpoints return `null`; API errors throw.
See the [Kit API reference](https://developers.kit.com/api-reference/webhooks/rotate-a-webhook-endpoint-secret).

## Deleting a webhook endpoint

`kit.webhookEndpoints.delete(id)` deletes the endpoint and stops future
deliveries of its subscribed events.

```ts
const result = await kit.webhookEndpoints.delete(2);
if (result === null) {
  console.log("Endpoint not found or inaccessible");
}
```

Kit returns an empty `204` response, which the SDK exposes as `{}`. Missing or
inaccessible endpoints return `null`; authentication and permission errors
throw. OAuth-created endpoints can only be deleted by the app that created them;
an API-key request returns a permission error. To stop deliveries temporarily,
use `kit.webhookEndpoints.update(id, { status: "disabled" })`. See the
[Kit API reference](https://developers.kit.com/api-reference/webhooks/delete-a-webhook-endpoint).

## Updating a webhook endpoint

Use `kit.webhookEndpoints.update(id, params)` to PATCH the supplied fields.
`name`, `url`, `description`, `status`, and `events` are all optional.

```ts
const result = await kit.webhookEndpoints.update(2, {
  status: "disabled",
});
console.log(result?.webhook_endpoint.status);
```

Set `status: "disabled"` to stop deliveries, or `"active"` to resume. Supplied
`events` replace the complete subscription list; include every event you want
the endpoint to receive. Omitted fields retain their existing values. Endpoints
created through OAuth can only be updated by the app that created them; API-key
updates return a permission error.

Exported types are `UpdateWebhookEndpointParams` and `UpdateWebhookEndpoint`.
Responses contain metadata without signing secrets. Missing endpoints return
`null`; authentication, permission, and validation errors throw. See the
[Kit API reference](https://developers.kit.com/api-reference/webhooks/update-a-webhook-endpoint).

## Creating a webhook endpoint

Use `kit.webhookEndpoints.create(params)` to register a publicly reachable
HTTP(S) delivery URL and the event types it should receive. `url` and `events`
are required; `name` and `description` are optional.

```ts
const result = await kit.webhookEndpoints.create({
  url: "https://hooks.example.com/incoming",
  events: ["subscriber.created", "custom_field.created"],
  name: "Subscriber notifications",
});
const signingSecret = result.webhook_endpoint.secret;
// Save signingSecret securely for webhook signature verification.
```

The exported types are `CreateWebhookEndpointParams` and `CreateWebhookEndpoint`.
Creation includes the signing secret; list/get responses omit it. Save the
secret when creating the endpoint. If it is lost, Kit's secret rotation endpoint
can issue a replacement. Kit rejects private, internal, and loopback delivery
URLs. API authentication and validation errors throw. See the
[Kit API reference](https://developers.kit.com/api-reference/webhooks/create-a-webhook-endpoint).

## Fetching a webhook endpoint

`kit.webhookEndpoints.get(id)` retrieves endpoint metadata, including subscribed
events, status, source, and timestamps. Signing secrets are never included.

```ts
const result = await kit.webhookEndpoints.get(2);
if (result) {
  console.log(result.webhook_endpoint.url, result.webhook_endpoint.events);
}
```

The exported `GetWebhookEndpoint` response wraps the shared `WebhookEndpoint`
metadata type. Missing endpoints and endpoints inaccessible to the current
account or app return `null`; authentication errors throw. See the
[Kit API reference](https://developers.kit.com/api-reference/webhooks/get-a-webhook-endpoint).

## Listing webhook endpoints

Use `kit.webhookEndpoints.list(params)` to discover Kit's current webhook
endpoints. These subscribe to multiple event types and receive signed,
automatically retried deliveries. `kit.webhooks` continues to expose the legacy
webhooks resource.

```ts
const page = await kit.webhookEndpoints.list({
  status: "active",
  include_total_count: true,
  per_page: 25,
});
for (const endpoint of page.webhook_endpoints) {
  console.log(endpoint.name, endpoint.url, endpoint.events);
}
if (page.pagination.has_next_page && page.pagination.end_cursor) {
  const next = await kit.webhookEndpoints.list({
    after: page.pagination.end_cursor,
    status: "active",
    per_page: 25,
  });
  console.log(next.webhook_endpoints);
}
```

The optional status filter accepts `"active"` or `"disabled"`. Pagination supports
`after`, `before`, `per_page` (default 500, maximum 1000), and
`include_total_count`. List responses contain endpoint metadata and omit signing
secrets. `previous_secret_expires_at` can be null. `created_by_app` uses `unknown`
because Kit leaves its nullable structure unspecified. API errors throw.

Exported types are `ListWebhookEndpoints`, `ListWebhookEndpointsParams`,
`WebhookEndpoint`, and `WebhookEndpointStatus`. See the
[Kit API reference](https://developers.kit.com/api-reference/webhooks/list-webhook-endpoints).

## Fetching a post

`kit.posts.get(id)` returns the post's full HTML content and publishing metadata.
No `include_content` flag is needed.

```ts
const result = await kit.posts.get(6);
if (result) {
  console.log(result.post.title, result.post.content, result.post.public_url);
}
```

The exported `GetPost` response requires `content`; list items keep it optional.
Publishing, SEO, and thumbnail metadata retain their nullable types, and
`product_id` remains optional and nullable. Missing posts return `null`;
authentication errors throw. See the
[Kit API reference](https://developers.kit.com/api-reference/posts/get-a-post).

## Listing posts

Use `kit.posts.list(params)` to fetch posts and their publishing metadata. HTML
content is omitted by default; request `include_content: true` to include it.

```ts
const page = await kit.posts.list({
  include_content: true,
  include_total_count: true,
  per_page: 25,
});
for (const post of page.posts) {
  console.log(post.title, post.status, post.public_url, post.content);
}
if (page.pagination.has_next_page && page.pagination.end_cursor) {
  const next = await kit.posts.list({
    after: page.pagination.end_cursor,
    include_content: true,
    per_page: 25,
  });
  console.log(next.posts);
}
```

Pagination supports `after`, `before`, `per_page` (default 500, maximum 1000),
and `include_total_count`. Drafts can have null slugs, URLs, and publish/send
timestamps. Description and thumbnail fields can also be null. `product_id` is
optional and nullable when no paid-post product is configured. A post sent as a
broadcast shares its `publication_id` with that broadcast. API errors throw.

Exported types are `ListPosts`, `ListPostsParams`, and `PostListItem`. See the
[Kit API reference](https://developers.kit.com/api-reference/posts/list-posts).

## Creating a snippet

Use `kit.snippets.create(params)` to create reusable email content. Inline
snippets require `name`, `snippet_type: "inline"`, and Liquid-enabled `content`:

```ts
const inline = await kit.snippets.create({
  name: "Welcome message",
  snippet_type: "inline",
  content: "Hello {{ subscriber.first_name }}!",
});
console.log(inline.snippet.key);
```

Block snippets require HTML in `document_attributes.value_html`:

```ts
const block = await kit.snippets.create({
  name: "Footer",
  snippet_type: "block",
  document_attributes: { value_html: "<p>Thanks for reading!</p>" },
});
console.log(block.snippet.document.value_html);
```

Use the returned key in emails as `{{ snippet.key }}`. Kit derives the key from
the name, and the snippet type is fixed at creation. Circular snippet references
produce a validation error. Authentication and validation errors throw.

The exported `CreateSnippetParams` union requires the content fields matching
the snippet type. `CreateSnippet` includes required content and document fields;
its document HTML can be `null` for inline snippets. See the
[Kit API reference](https://developers.kit.com/api-reference/snippets/create-a-snippet).

## Updating a snippet

Use `kit.snippets.update(id, params)` to rename, edit, archive, or restore a
snippet. Fields are optional; omitted fields retain their existing values.

```ts
const inline = await kit.snippets.update(5, {
  content: "Hello {{ subscriber.first_name }}!",
  archived: false,
});
const block = await kit.snippets.update(6, {
  document_attributes: { value_html: "<p>Updated footer</p>" },
});
console.log(inline?.snippet.key, block?.snippet.document.value_html);
```

Use `content` for existing inline snippets and `document_attributes.value_html`
for existing block snippets. `snippet_type` is optional and must match the
existing type if supplied; changing it or sending the wrong body shape produces
a validation error. `archived: true` archives and `false` restores. Content
changes apply on the next send of every email referencing the snippet key.

Exported types are `UpdateSnippetParams` and `UpdateSnippet`. The response always
includes content and document. Missing snippets return `null`; authentication
and validation errors throw. See the
[Kit API reference](https://developers.kit.com/api-reference/snippets/update-a-snippet).

## Fetching a snippet

`kit.snippets.get(id)` always includes the snippet's full content and document;
no `include_content` flag is needed.

```ts
const result = await kit.snippets.get(5);
if (result) {
  console.log(result.snippet.key, result.snippet.content);
  console.log(result.snippet.document.value_html);
}
```

The exported `GetSnippet` response requires both `content` and `document`, while
list items keep those fields optional. Missing snippets return `null`;
authentication errors throw. See the
[Kit API reference](https://developers.kit.com/api-reference/snippets/get-a-snippet).

## Listing snippets

Use `kit.snippets.list(params)` to discover reusable email content. Each snippet's
`key` is used in Liquid as `{{ snippet.key }}` in broadcasts and sequence emails.

```ts
const page = await kit.snippets.list({
  snippet_type: "inline",
  archived: false,
  include_content: true,
  per_page: 25,
});
for (const snippet of page.snippets) {
  console.log(snippet.key, snippet.content, snippet.document?.value_html);
}
if (page.pagination.has_next_page && page.pagination.end_cursor) {
  const next = await kit.snippets.list({
    after: page.pagination.end_cursor,
    snippet_type: "inline",
    archived: false,
    include_content: true,
    per_page: 25,
  });
  console.log(next.snippets);
}
```

Content and document fields are omitted by default; `include_content: true`
requests both. `snippet_type` accepts `"inline"` or `"block"`. Archived snippets
are excluded by default; `archived: true` returns only archived snippets.
Pagination supports `after`, `before`, `per_page` (default 500, maximum 1000),
and `include_total_count`. API errors throw.

The `after`, `before`, `archived`, `per_page`, and `snippet_type` parameters
also accept `null`. Null and undefined values are omitted from the query so Kit
uses its defaults. An explicit `archived: false` is sent as `false`.

Exported types are `ListSnippets`, `ListSnippetsParams`, `SnippetListItem`,
`SnippetDocument`, and `SnippetType`. Document `value` and `value_plain` use
`unknown` because Kit's schema leaves their nullable structure unspecified.
See the [Kit API reference](https://developers.kit.com/api-reference/snippets/list-snippets).

## Deleting a sequence email

`kit.sequenceEmails.delete(sequenceId, emailId)` permanently removes one email
from a sequence. Subscribers already queued for it skip to the next email.

```ts
const result = await kit.sequenceEmails.delete(123, 456);
if (result === null) {
  console.log("Sequence or email not found");
}
```

Kit returns an empty `204` response, which the SDK exposes as `{}`. Missing
sequences or emails return `null`; authentication errors throw. To pause delivery,
use `kit.sequenceEmails.update(sequenceId, emailId, { published: false })`.
See the [Kit API reference](https://developers.kit.com/api-reference/sequence-emails/delete-a-sequence-email).

## Updating a sequence email

Use `kit.sequenceEmails.update(sequenceId, emailId, params)` to change content,
timing, position, or publication state. All fields are optional; only supplied
fields change:

```ts
const result = await kit.sequenceEmails.update(123, 456, {
  subject: "Updated subject",
  content: "<p>Updated content</p>",
  published: false,
});
console.log(result?.email.subject);
```

Pass `email_template_id: null` to clear the template, or `send_days: null` to
reset a day-based email's schedule override. Kit then returns all seven sending
days to indicate no per-email restriction. Sending `send_days` for an hour-based
email produces a validation error. Changing position while subscribers are
progressing can cause deliveries to be reordered or skipped; publishing an email
at position zero triggers processing of its queued subscribers.

The exported types are `UpdateSequenceEmailParams` and `UpdateSequenceEmail`.
The response includes the content field and allows nullable content, preview
text, sending days, and position. Missing sequences or emails return `null`;
validation errors throw. See the
[Kit API reference](https://developers.kit.com/api-reference/sequence-emails/update-a-sequence-email).

## Creating a sequence email

Use `kit.sequenceEmails.create(sequenceId, params)` to add an email. The subject,
`delay_value`, and `delay_unit` (`"days"` or `"hours"`) are required:

```ts
const result = await kit.sequenceEmails.create(123, {
  subject: "Welcome to the series",
  delay_value: 1,
  delay_unit: "days",
  content: "<p>Thanks for joining!</p>",
});
console.log(result?.email.id);
```

Emails are drafts by default and append to the sequence when `position` is
omitted. Optional fields include `preview_text`, `content`, `email_template_id`,
`published`, `send_days`, and `position`. Day-based emails follow the sequence's
schedule unless `send_days` overrides it. Hour-based emails ignore the schedule
and return `send_days: null`. Only the first email can have a zero-day delay;
subsequent emails require a positive delay. Publishing an immediate email or
inserting a published email earlier in the sequence can trigger deliveries to
existing subscribers.

The exported types are `CreateSequenceEmailParams` and `CreateSequenceEmail`.
The response includes `content`, which can be `null` for drafts; `preview_text`
can also be `null`. Missing sequences return `null`, and validation errors throw.
See the [Kit API reference](https://developers.kit.com/api-reference/sequence-emails/create-a-sequence-email).

## Fetching a sequence email

`kit.sequenceEmails.get(sequenceId, emailId, params)` always returns the email's
content field, which can be `null` for drafts. Use `include: "stats"` to request per-email performance metrics:

```ts
const result = await kit.sequenceEmails.get(123, 456, { include: "stats" });
if (result) {
  console.log(result.email.content, result.email.stats?.open_rate);
}
```

The response uses `GetSequenceEmail`, where `content` is required and `stats`
is optional. No `include_content` flag is needed. Missing sequences or emails
return `null`. Options use the exported `GetSequenceEmailParams` type. See the
[Kit API reference](https://developers.kit.com/api-reference/sequence-emails/get-a-sequence-email).

## Listing sequence emails

Use `kit.sequenceEmails.list(sequenceId, params)` to fetch a page of emails
ordered by position. Each item includes its subject, publication state,
template, delay, and sending days. Content and stats are optional:

```ts
const page = await kit.sequenceEmails.list(123, {
  include_content: true,
  include: "stats",
  per_page: 25,
});
if (page) {
  for (const email of page.emails) {
    console.log(email.subject, email.content, email.stats?.open_rate);
  }
  if (page.pagination.has_next_page && page.pagination.end_cursor) {
    const next = await kit.sequenceEmails.list(123, {
      after: page.pagination.end_cursor,
      per_page: 25,
      include_content: true,
      include: "stats",
    });
    console.log(next?.emails);
  }
}
```

Pagination supports `after`, `before`, `per_page`, and `include_total_count`.
Missing sequences return `null`. HTML content is omitted by default; request
`include_content: true` to include it. Draft content and preview text can be
`null`; hour-based emails return `send_days: null`. Per-email stats use zero when no delivery
data is available. Exported types are `ListSequenceEmails`,
`ListSequenceEmailsParams`, `SequenceEmailListItem`, and `SequenceEmailStats`.
See the [Kit API reference](https://developers.kit.com/api-reference/sequence-emails/list-sequence-emails).

## Deleting a sequence

`kit.sequences.delete(id)` soft-deletes a sequence and stops active deliveries
immediately. Associated state is cleaned up in the background, and Visual
Automations referencing the sequence need updating. If you only need to pause
delivery, use `kit.sequences.update(id, { active: false })`.

```ts
const result = await kit.sequences.delete(123);
if (result === null) {
  console.log("Sequence not found");
}
```

The method sends a bodyless DELETE and returns `{}` for Kit's successful
`204 No Content` response, or `null` when the sequence is missing. See the
[Kit API reference](https://developers.kit.com/api-reference/sequences/delete-a-sequence).

## Updating a sequence

Use `kit.sequences.update(id, params)` to change only the supplied settings.
All creation settings are optional in `UpdateSequenceParams`; omitted fields
retain their current values. For example, pause a sequence without changing
its name or schedule:

```ts
const result = await kit.sequences.update(123, { active: false });
if (result) {
  console.log(result.sequence.active);
}
```

An empty `exclude_subscriber_sources` array clears exclusions. False flags and
`send_hour: 0` are sent as supplied. Updates return `UpdateSequence`, or `null`
if the sequence is missing; Kit validation errors are thrown.

Setting `active: true` resumes queued subscribers. Schedule changes affect
future sends and do not reschedule emails already queued. See the
[Kit API reference](https://developers.kit.com/api-reference/sequences/update-a-sequence).

## Creating a sequence

Only `name` is required to create an empty sequence. Kit supplies the default
sending settings and schedule for omitted options:

```ts
const result = await kit.sequences.create({ name: "Welcome" });
console.log(result.sequence.id);
```

You can also provide `email_address`, `email_template_id`, `send_days`,
`send_hour` (0–23), `time_zone` (an IANA timezone), `active`, `repeat`, `hold`, and
`exclude_subscriber_sources`. Exclusions accept `tag`, `sequence`, `form`, or
`segment` with an array of IDs. For example:

```ts
const result = await kit.sequences.create({
  name: "Weekday onboarding",
  send_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  send_hour: 9,
  time_zone: "Australia/Adelaide",
  active: false,
  exclude_subscriber_sources: [{ type: "tag", ids: [42] }],
});
```

The exported types are `CreateSequence`, `CreateSequenceParams`, and
`SequenceSendDay`. Creation returns the server's sequence settings; it creates
the container without adding emails. See the
[Kit API reference](https://developers.kit.com/api-reference/sequences/create-a-sequence).

## Listing sequences with stats

Request `include: "stats"` with `kit.sequences.list()` to fetch performance data
for a page of sequences:

```ts
const first = await kit.sequences.list({ include: "stats", per_page: 25 });
for (const sequence of first.sequences) {
  console.log(sequence.name, sequence.stats?.open_rate);
}
if (first.pagination.has_next_page && first.pagination.end_cursor) {
  const next = await kit.sequences.list({
    include: "stats",
    per_page: 25,
    after: first.pagination.end_cursor,
  });
  console.log(next.sequences);
}
```

List items use the exported `SequenceListItem` type. Core metadata (`id`, `name`,
`hold`, `repeat`, `created_at`) remains required; additional settings, schedule,
exclusions, counts, and stats are optional. Stats reuse `SequenceStats`, including
nullable delivery metrics. Keep `include: "stats"` on subsequent page requests.
Existing calls without stats continue to work. See the
[Kit API reference](https://developers.kit.com/api-reference/sequences/list-sequences).

## Fetching sequence details

Use `kit.sequences.get(id)` to fetch a sequence's schedule, sending address and
template, activity flags, and subscriber exclusions. Request `include: "stats"`
to include deliverability statistics:

```ts
const result = await kit.sequences.get(123, { include: "stats" });
if (result) {
  console.log(result.sequence.name, result.sequence.time_zone);
  console.log(result.sequence.stats?.open_rate);
}
```

Missing sequences return `null`. The sending address and template can be null;
email/subscriber counts and stats may be absent. Delivery metrics can be null
when there is no delivery data. `stats.unsubscribers` counts current cancelled
sequence subscriptions, while `stats.email_unsubscribes` counts email events.
The exported types are `GetSequence`, `GetSequenceParams`, and `SequenceStats`.
See the [Kit API reference](https://developers.kit.com/api-reference/sequences/get-a-sequence).

## Reusable subscriber filter conditions

The package exports the types used by `kit.subscribers.filter()` so you can
compose named conditions:

```ts
import type {
  FilterSubscriberBody,
  FilterSubscriberBodyAllBase,
  FilterSubscriberBodyAllSubscribed,
  FilterSubscriberBodyAnyBroadcast,
  FilterSubscriberBodyAnyUrls,
} from "@anthonyhagi/kit-node-sdk";

const signup: FilterSubscriberBodyAllSubscribed = {
  type: "subscribed",
  after: "2026-01-01",
};
const broadcast: FilterSubscriberBodyAnyBroadcast = {
  type: "broadcasts",
  ids: [7],
};
const url: FilterSubscriberBodyAnyUrls = {
  type: "urls",
  urls: ["kit.com"],
  matching: "contains",
};
const engagement: FilterSubscriberBodyAllBase = {
  type: "clicks",
  count_greater_than: 0,
  any: [broadcast, url],
};
const filter: FilterSubscriberBody = { all: [signup, engagement] };
const result = await kit.subscribers.filter(filter);
```

`FilterSubscriberBodyAnyUrls` also accepts an ID-only condition such as
`{ type: "urls", ids: [7] }`, or patterns with no matching mode:
`{ type: "urls", urls: ["https://kit.com/news"] }`. Both `urls` and `matching`
are optional; Kit defaults omitted pattern matching to `exact`. The SDK sends
the supplied condition without adding a matching mode or a patterns array.

`FilterSubscriberBodyAllBase` covers opens, clicks, sends (`sent`), and
`delivered` engagement conditions. Conditions in `all` are combined with AND;
the nested `any` array combines broadcast or URL conditions with OR.
See [Kit's filtering reference](https://developers.kit.com/api-reference/subscribers/filter-subscribers-by-engagement-sign-up-date-state-and-tags).

## Broadcast creation filters

Use an array of filter groups when creating a targeted broadcast. Kit supports
one filter group type per request: `all` (AND), `any` (OR), or `none` (NOT).
For example, this creates a draft for subscribers with either of two tags:

```typescript
const broadcast = await kit.broadcasts.create({
  subject: "Newsletter",
  content: "<p>Our latest news</p>",
  description: "Monthly update",
  preview_text: "Catch up with us",
  public: false,
  published_at: "2026-01-01T12:00:00Z",
  send_at: null,
  subscriber_filter: [{ any: [{ type: "tag", ids: [7, 8] }] }],
});
```

Use `type: "segment"` to target segment IDs. Existing single-object filters are
also accepted and wrapped in an array before sending. A `null` filter is passed
through unchanged. See the [Kit API reference](https://developers.kit.com/api-reference/broadcasts/create-a-broadcast).

## Broadcast list filters

Filter `kit.broadcasts.list()` by lifecycle `status` (`draft`, `scheduled`,
`sending`, `completed`, or `aborted`) and sent dates in `YYYY-MM-DD` format.
These filters can be combined with cursor pagination:

```typescript
const filters = {
  status: "completed" as const,
  sent_after: "2026-01-01",
  sent_before: "2026-02-01",
  per_page: 100,
};
const firstPage = await kit.broadcasts.list(filters);

if (firstPage.pagination.has_next_page && firstPage.pagination.end_cursor) {
  const nextPage = await kit.broadcasts.list({
    ...filters,
    after: firstPage.pagination.end_cursor,
  });
}
```

Keep the same filters on subsequent pages. All filters are optional; calls
without arguments continue to work. See the [Kit API reference](https://developers.kit.com/api-reference/broadcasts/list-broadcasts).

## Slim broadcast lists

Use `slim: true` when you only need broadcast metadata. Kit omits `content`,
`public_url`, `email_address`, `email_template`, and `subscriber_filter` for a
smaller, faster response:

```ts
const page = await kit.broadcasts.list({ slim: true, per_page: 25 });
for (const broadcast of page.broadcasts) {
  console.log(broadcast.id, broadcast.subject);
}
```

Literal `slim: true` calls return `ListSlimBroadcasts`. Calls without `slim`, or
with `slim: false`, return `ListBroadcasts`. A runtime boolean returns a union
of both types; check for a full-response field before accessing it:

```ts
const page = await kit.broadcasts.list({ slim: useSlim }); // useSlim: boolean
for (const broadcast of page.broadcasts) {
  if ("content" in broadcast) {
    console.log(broadcast.content);
  }
}
```

Slim responses retain pagination and support the same list filters. See the
[Kit API reference](https://developers.kit.com/api-reference/broadcasts/list-broadcasts).

## Broadcast response status and targeting

Full broadcast responses from `list()`, `get()`, `create()`, and `update()` expose
`status` as `BroadcastStatus`: `draft`, `scheduled`, `sending`, `completed`, or
`aborted`. Slim list responses retain `status`.

Full responses share `BroadcastSubscriberFilterResponseGroup[]` for
`subscriber_filter`. Each group can contain `all`, `any`, or `none`; inactive
groups may be absent or null. The default `{ type: "all_subscribers" }` item has
no IDs, while targeted items include `ids`:

```ts
const result = await kit.broadcasts.get(123);
if (result) {
  console.log(result.broadcast.status);
  for (const group of result.broadcast.subscriber_filter) {
    for (const item of group.all ?? group.any ?? group.none ?? []) {
      console.log(item.type, item.ids);
    }
  }
}
```

When constructing typed response fixtures, provide `status` and handle missing
or null filter groups before accessing their items. Slim responses omit
`subscriber_filter`. See the
[Kit API reference](https://developers.kit.com/api-reference/broadcasts/get-a-broadcast).

## Broadcast link click pagination

`kit.broadcasts.getLinkClicksById(id, params)` accepts `after`, `before`,
`per_page`, and `include_total_count`. These options paginate the tracked links
within a broadcast. Each click item includes its tracked link `id`.

```ts
const first = await kit.broadcasts.getLinkClicksById(123, { per_page: 25 });
if (first?.pagination.has_next_page && first.pagination.end_cursor) {
  const next = await kit.broadcasts.getLinkClicksById(123, {
    after: first.pagination.end_cursor,
    per_page: 25,
  });
  console.log(next?.broadcast.clicks);
}
```

Existing calls with only an ID continue to work. Typed `BroadcastLinkClick`
fixtures must include `id`. See the
[endpoint reference](https://developers.kit.com/api-reference/broadcasts/get-link-clicks-for-a-broadcast)
and [pagination guide](https://developers.kit.com/api-reference/pagination).

## Broadcast stats pagination

`kit.broadcasts.getAllStats()` returns one page of stats (500 broadcasts by
default, up to 1000 per page). Pass `after` or `before` to retrieve another page.
You can also filter by `status`, `sent_after`, and `sent_before`:

```typescript
const firstPage = await kit.broadcasts.getAllStats({
  per_page: 100,
  status: "completed",
  sent_after: "2026-01-01",
  sent_before: "2026-02-01",
  include_total_count: true,
});

for (const broadcast of firstPage.broadcasts) {
  console.log(broadcast.id, broadcast.subject, broadcast.send_at);
}

if (firstPage.pagination.has_next_page && firstPage.pagination.end_cursor) {
  const nextPage = await kit.broadcasts.getAllStats({
    after: firstPage.pagination.end_cursor,
    per_page: 100,
    status: "completed",
    sent_after: "2026-01-01",
    sent_before: "2026-02-01",
  });
}
```

Each stats item can include `subject` and `send_at` alongside `id` and `stats`.
These metadata fields are optional in `GetBroadcastStats`; `send_at` can also be
`null` for an unscheduled broadcast. Handle omitted fields when displaying them.

Keep the same filters when paging. Requesting the total count can slow responses,
so request it on the first page and reuse it. Existing calls without arguments
continue to work. See the [Kit API reference](https://developers.kit.com/api-reference/broadcasts/get-stats-for-a-list-of-broadcasts)
for the endpoint contract.

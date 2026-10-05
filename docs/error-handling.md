# Errors, retries, and rate limits

[Documentation index](README.md) · [Project overview](../README.md)

These snippets assume `Kit` has been imported and `kit` initialized as shown
in [Getting started](getting-started.md).

The SDK provides robust error handling with automatic retry logic for transient failures:

## Automatic Retries

The SDK automatically retries requests for:

- **5xx server errors** (500, 502, 503, etc.) - Transient server issues
- **429 rate limiting** - Too many requests
- **Network errors** - Failures of the fetch request

**Non-retryable errors** (handled immediately):

- **4xx client errors** (400, 401, 403, 404, 422) - These indicate client-side issues

A 404 response returns `null`. Other non-retryable client errors throw.
Empty successful response bodies return `{}`. Errors reading or parsing a
successful response body throw without repeating the request.

HTTP failures throw the exported `ApiError`, an `Error` subclass with a numeric
`status` and `details` containing the parsed JSON response body or raw text for
non-JSON bodies. Its message retains the existing human-readable error text.
Treat `details` as `unknown` and validate its shape before accessing fields.
Retryable failures expose the final response after exhausting retry attempts.
Network errors, timeouts, and successful response parsing failures retain their
original error types. A 404 continues to return `null`.

Successful responses are not retried to check data freshness. See
[Data consistency](data-consistency.md) for reading lists and counts after writes.

## Email stats retention errors

Starting October 15, 2026, requests for broadcast stats or explicit stats date
ranges outside Kit's five-year retention window can return HTTP 400. The SDK
throws an `ApiError` with `status === 400` without retrying. These responses do
not return `null`. For date-range errors, Kit indicates the earliest available
date in the response; inspect `details` after validating its shape.

See [affected SDK methods](resources.md#email-stats-retention) and
[Kit's retention policy](https://developers.kit.com/api-reference/email-data-retention).

## Exponential Backoff

Retries use exponential backoff with jitter to prevent overwhelming servers:

- 1st retry: ~1 second delay
- 2nd retry: ~2 seconds delay
- 3rd retry: ~4 seconds delay
- Each with ±12.5% randomization to prevent thundering herd

When a retryable response includes `Retry-After`, the SDK waits for the longer
of its backoff delay and the server's requested delay. The header can specify
whole seconds or an HTTP date. Missing, invalid, or expired values fall back to
backoff. This minimum wait applies even when `retryDelay` is `0`; `maxRetries: 0`
still disables retries entirely.

Both network and HTTP retries split long waits into timer-safe chunks, avoiding
Node's 1ms fallback for overflowing timers. Calculated backoff saturates at
`Number.MAX_SAFE_INTEGER` milliseconds if exponential growth exceeds that
limit. A `retryDelay` of `0` keeps backoff disabled at every attempt.

## Request Cancellation

Pass an `AbortSignal` in the options for direct `kit.get()`, `post()`, `put()`,
`patch()`, or `delete()` calls:

```typescript
const controller = new AbortController();
const pendingRequest = kit.get("/subscribers", { signal: controller.signal });

// Cancel when the caller no longer needs the result.
controller.abort();
await pendingRequest; // Rejects with the signal's abort reason.
```

For subscriber list requests, pass request controls as the second argument:

```typescript
const subscribers = await kit.subscribers.list(
  { status: "active", per_page: 25, after: nextCursor },
  { signal: controller.signal }
);
```

All subscriber methods accept request options as their final argument. For
example, `kit.subscribers.get(id, { signal })` and
`kit.subscribers.update(id, params, { signal })` support cancellation too.

For methods with optional filters, pass `undefined` to skip them:
`kit.subscribers.list(undefined, { signal })`,
`kit.subscribers.filter(body, undefined, { signal })`,
`kit.subscribers.getStats(id, undefined, { signal })`, or
`kit.subscribers.getTags(id, undefined, { signal })`.
The exported `RequestOptions` type describes these controls; the signal is never
sent as a query parameter.

All tag methods also accept request options as their final argument:

```typescript
await kit.tags.tagSubscriber(tagId, subscriberId, { signal });
await kit.tags.bulkTag({ taggings }, { signal });
await kit.tags.list(undefined, { signal });
await kit.tags.listSubscribers(tagId, undefined, { signal });
```

All form methods accept request options as their final argument too. Pass
`undefined` for optional filters or referral parameters when skipping them:

```typescript
await kit.forms.list(undefined, { signal });
await kit.forms.listSubscribers(formId, { slim: true }, { signal });
await kit.forms.addSubscriber(formId, subscriberId, undefined, { signal });
await kit.forms.bulkAddSubscribers({ additions }, { signal });
```

All sequence methods accept request options as their final argument:

```typescript
await kit.sequences.list(undefined, { signal });
await kit.sequences.get(sequenceId, undefined, { signal });
await kit.sequences.listSubscribers(sequenceId, undefined, { signal });
await kit.sequences.update(sequenceId, { active: false }, { signal });
await kit.sequences.addSubscriberById(sequenceId, subscriberId, { signal });
```

All broadcast methods accept request options as their final argument, including
stats and link-click requests. Skip optional filters with `undefined`:

```typescript
await kit.broadcasts.list({ slim: true }, { signal });
await kit.broadcasts.get(broadcastId, { signal });
await kit.broadcasts.getAllStats(undefined, { signal });
await kit.broadcasts.getLinkClicksById(broadcastId, undefined, { signal });
```

All sequence-email methods also accept request options as their final argument.
For `get()` and `list()`, pass `undefined` to skip optional inclusion or pagination
parameters:

```typescript
await kit.sequenceEmails.get(sequenceId, emailId, undefined, { signal });
await kit.sequenceEmails.list(sequenceId, { include: "stats" }, { signal });
await kit.sequenceEmails.update(
  sequenceId,
  emailId,
  { published: false },
  { signal }
);
```

All purchase methods accept request options as their final argument:

```typescript
await kit.purchases.list(undefined, { signal });
await kit.purchases.get(purchaseId, { signal });
await kit.purchases.create({ purchase }, { signal });
```

All webhook endpoint methods accept request options as their final argument,
including secret rotation and revocation. Skip optional list or rotation parameters
with `undefined`:

```typescript
await kit.webhookEndpoints.list(undefined, { signal });
await kit.webhookEndpoints.get(endpointId, { signal });
await kit.webhookEndpoints.rotateSecret(endpointId, undefined, { signal });
await kit.webhookEndpoints.revokePreviousSecret(endpointId, { signal });
```

The legacy `kit.webhooks` methods also accept request options as their final
argument:

```typescript
await kit.webhooks.list(undefined, { signal });
await kit.webhooks.create({ target_url, event }, { signal });
await kit.webhooks.delete(webhookId, { signal });
```

All custom-field methods accept request options as their final argument, including
bulk creation and subscriber-value updates:

```typescript
await kit.customFields.list(undefined, { signal });
await kit.customFields.create({ label: "Company" }, { signal });
await kit.customFields.bulkCreate({ custom_fields }, { signal });
await kit.customFields.bulkUpdateSubscriberValues(
  { custom_field_values, callback_url: null },
  { signal }
);
```

Cancellation stops pending fetches, response body reads, and retry waits. An
already-aborted signal prevents the initial request. Caller cancellations are
never retried. `timeoutMs` still applies independently to each attempt, and timed-out
fetches remain eligible for retry. Cancelling a request does not undo an operation
that Kit has already processed.

## Request Timeouts

Set `timeoutMs` on the client to abort an attempt that takes too long:

```typescript
const kitWithTimeout = new Kit({
  apiKey: "your-api-key",
  timeoutMs: 10000,
  maxRetries: 1,
});
```

The timeout defaults to disabled (`0`). Each attempt gets its own timer covering
the fetch and response body reading; backoff waits are excluded. Fetch timeouts
follow the configured retry limits and eventually throw a `TimeoutError`.
Timeouts reading a successful response body throw without repeating the
operation. Timers are cleared when attempts finish or enter retry backoff.

## Error Handling Example

```typescript
import { ApiError } from "@anthonyhagi/kit-node-sdk";

try {
  const account = await kit.accounts.getCurrentAccount();
  console.log(account);
} catch (error) {
  if (error instanceof ApiError) {
    console.error("API failure:", error.status, error.message, error.details);
  } else {
    console.error(
      "Request failure:",
      error instanceof Error ? error.message : String(error)
    );
  }
  // Retryable failures throw after exhausting the configured attempts.
  // Client errors and response parsing failures throw without retries.
}
```

## Custom Retry Configuration

```typescript
// Aggressive retry strategy for critical operations
const kit = new Kit({
  apiKey: "your-api-key",
  maxRetries: 5, // Retry up to 5 times
  retryDelay: 2000, // Start with 2 second delays
});

// Conservative strategy for less critical operations
const kitConservative = new Kit({
  apiKey: "your-api-key",
  maxRetries: 1, // Only retry once
  retryDelay: 500, // Quick retries
});
```

## Rate Limiting

The SDK automatically handles rate limiting (HTTP 429) responses with exponential backoff retries. When you encounter rate limits, the SDK will:

1. **Automatically retry** the request after a delay
2. **Use exponential backoff** to progressively increase wait times
3. **Add jitter** to prevent multiple clients from retrying simultaneously
4. **Respect your configured retry limits**

```typescript
// The SDK handles this automatically
const subscribers = await kit.subscribers.list();
// If rate limited, this will retry up to 3 times with increasing delays
```

For high-volume applications, consider:

- Implementing request queuing in your application
- Using larger retry delays: `retryDelay: 5000`
- Increasing retry attempts: `maxRetries: 5`
- Monitoring your retry patterns and adjusting configuration as needed

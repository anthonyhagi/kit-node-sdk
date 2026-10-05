# Data consistency

[Documentation index](README.md) · [Project overview](../README.md)

Subscriber lists, filters, counts, and reporting can temporarily lag behind
writes. Kit reports a typical propagation delay of about 30 seconds, with up to
five minutes under normal conditions; these are estimates, not SDK deadlines.
Direct ID lookups and resource data returned by writes are strongly consistent.
See [Kit's consistency guide](https://developers.kit.com/api-reference/eventual-consistency).

## Use the returned ID

Use the write response for subsequent operations instead of searching a list
immediately afterward:

```ts
import { Kit } from "@anthonyhagi/kit-node-sdk";

const kit = new Kit({ apiKey: "YOUR_API_KEY" });
const created = await kit.subscribers.create({
  email_address: "ada@example.com",
  first_name: "Ada",
});
const subscriberId = created.subscriber.id;
const tagId = 123; // Replace with an existing tag ID.
await kit.tags.tagSubscriber(tagId, subscriberId);

// Direct ID lookups reflect committed subscriber state.
const subscriber = await kit.subscribers.get(subscriberId);
console.log(subscriber?.subscriber);
```

An asynchronous bulk acknowledgement means work is queued, not completed.
Processing adds time before list results converge; use the configured callback
for bulk results. See [Kit's bulk processing guide](https://developers.kit.com/api-reference/bulk-and-async-processing).

## Successful responses and retries

The SDK returns successful list responses even when they omit recent changes.
`maxRetries` and `retryDelay` handle request failures; they do not detect stale
results. See [retry behavior](error-handling.md#automatic-retries).

If list visibility matters, implement bounded read polling with backoff and a
deadline. A timeout does not prove the write failed; avoid repeating writes
based on temporarily stale lists or counts.

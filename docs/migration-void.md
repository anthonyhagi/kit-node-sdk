# Migrating no-data results

[Documentation index](README.md)

Methods that return no meaningful data now return `Promise<void>` and resolve
with `undefined` instead of an empty object. This is a breaking change.

Affected methods:

- `broadcasts.delete`
- `customFields.delete`
- `sequenceEmails.delete`
- `sequences.delete`
- `subscribers.unsubscribe`
- `subscribers.deleteLocation`
- `tags.removeSubscriber`
- `tags.removeSubscriberByEmail`
- `webhookEndpoints.delete`
- `webhooks.delete`

Await the operation to establish success; remove checks or reads of the former
empty object:

```typescript
await kit.broadcasts.delete(broadcastId);
```

Replace truthiness checks on the result. They used to pass on success because
`{}` is truthy, but `undefined` is falsy, so in JavaScript the check now takes
the failure branch even though the operation succeeded. TypeScript reports these
checks as errors (TS1345) because the result is `void`.

```typescript
// Before: always truthy on success
if (await kit.tags.removeSubscriber(tagId, subscriberId)) {
  console.log("Removed");
}

// After: reaching the next statement means it succeeded
await kit.tags.removeSubscriber(tagId, subscriberId);
console.log("Removed");
```

To treat an already-missing resource as success, catch only `NotFoundError`:

```typescript
import { NotFoundError } from "@anthonyhagi/kit-node-sdk";

try {
  await kit.webhooks.delete(webhookId);
} catch (error) {
  if (!(error instanceof NotFoundError)) throw error;
}
```

`void` expresses that callers receive no useful value. The actual runtime result
is `undefined`, even when Kit sends an empty JSON object. Unsuccessful HTTP
responses still throw `ApiError`; a 404 throws its `NotFoundError` subclass. Network failures,
cancellation, and validation errors still reject the promise.

Bulk operations retain their synchronous results or asynchronous acknowledgments,
including `type: "asynchronous"`. Secret revocation still returns endpoint metadata.

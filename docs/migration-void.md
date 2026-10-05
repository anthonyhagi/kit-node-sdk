# Migration: no-data results

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

`void` expresses that callers receive no useful value. The actual runtime result
is `undefined`, even when Kit sends an empty JSON object. Unsuccessful HTTP
responses still throw `ApiError`, including status 404. Network failures,
cancellation, and validation errors still reject the promise.

Bulk operations retain their synchronous results or asynchronous acknowledgments,
including `type: "asynchronous"`. Secret revocation still returns endpoint metadata.

---
"@anthonyhagi/kit-node-sdk": minor
---

BREAKING: Resource operations with no meaningful response data now return `Promise<void>` and resolve to `undefined` instead of `{}`. This applies to deletes, subscriber unsubscribe/location removal, and tag removal. Bulk acknowledgments and methods returning resource metadata are unchanged. See `docs/migration-void.md` for migration guidance.

---
"@anthonyhagi/kit-node-sdk": patch
---

Expose optional `location` and `canceled_at` fields on `GetSubscriber`. Type cancellation timestamps and undetermined location fields as nullable, matching Kit's response schema.

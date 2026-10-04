---
"@anthonyhagi/kit-node-sdk": patch
---

Correct the subscriber engagement filter discriminator from `broadcast` to `broadcasts` to match the Kit API. Broadcast filter callers should use `type: "broadcasts"`.

---
"@anthonyhagi/kit-node-sdk": minor
---

Add `slim` to `broadcasts.list()` with a `ListSlimBroadcasts` response type that omits expensive fields. Default and `slim: false` calls retain full response types; runtime boolean options return a union of both response types.

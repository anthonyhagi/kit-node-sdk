---
"@anthonyhagi/kit-node-sdk": minor
---

Add an optional `timeoutMs` client setting that aborts each request attempt, including response body reading. Timeouts default to disabled, fetch timeouts follow retry limits, and successful response body timeouts throw without repeating the operation.

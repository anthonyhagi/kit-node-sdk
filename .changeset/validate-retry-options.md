---
"@anthonyhagi/kit-node-sdk": patch
---

Reject invalid retry options when constructing the client: `maxRetries` must be a non-negative safe integer and `retryDelay` must be a finite non-negative number. Preserve zero values and default options.

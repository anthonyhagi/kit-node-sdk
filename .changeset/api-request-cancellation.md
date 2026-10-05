---
"@anthonyhagi/kit-node-sdk": minor
---

Support per-request AbortSignal cancellation on direct API methods, including response reads and retry waits. Caller cancellations propagate without retrying; per-attempt timeout retries remain supported.

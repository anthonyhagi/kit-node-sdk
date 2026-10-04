---
"@anthonyhagi/kit-node-sdk": patch
---

Use timer-safe waits for network and HTTP retries, cap calculated backoff at the maximum safe integer, and preserve disabled backoff at high retry counts.

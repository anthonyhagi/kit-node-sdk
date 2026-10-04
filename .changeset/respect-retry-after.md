---
"@anthonyhagi/kit-node-sdk": patch
---

Respect valid `Retry-After` headers on retryable HTTP responses, using the longer of the requested wait and configured backoff. Support seconds and HTTP dates, retain backoff for invalid headers, and split long waits to avoid Node timer overflow.

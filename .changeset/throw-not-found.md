---
"@anthonyhagi/kit-node-sdk": minor
---

BREAKING: All HTTP 404 responses now throw NotFoundError, a new exported ApiError subclass with status and response details, instead of returning null. Resource return types no longer include a top-level null union. Replace null checks with ApiError handling; see docs/migration-404.md. Successful response payloads and bulk acknowledgements are unchanged.

---
"@anthonyhagi/kit-node-sdk": patch
---

Disable automatic webhook endpoint secret rotation retries by default to avoid replaying uncertain rotations. Explicit request retry overrides remain available.

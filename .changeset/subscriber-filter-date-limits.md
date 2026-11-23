---
"@anthonyhagi/kit-node-sdk": patch
---

Document Kit's three-year limit on `subscribers.filter()` engagement dates and `stats` include ranges: older dates now return HTTP 400 naming the earliest allowed date instead of being clamped. Signup (`subscribed`) dates have no cap. The SDK still passes dates through unchanged.

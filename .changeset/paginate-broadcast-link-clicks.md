---
"@anthonyhagi/kit-node-sdk": minor
---

Add optional pagination parameters to `broadcasts.getLinkClicksById()` so callers can retrieve subsequent pages of links and request total counts. Export `GetLinkClicksParams` and include the tracked link `id` in `BroadcastLinkClick`. Existing single-ID calls continue to work; typed link fixtures must now include `id`.

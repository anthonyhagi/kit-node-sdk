---
"@anthonyhagi/kit-node-sdk": patch
---

Document Kit's plain-text 429 responses (no `Retry-After`) and per-credential rate limits, which methods require OAuth, and that archived, deleted or restricted forms now reject `forms.addSubscriber()` and `forms.addSubscriberByEmail()` with HTTP 422 while bulk additions report them in `failures`. No runtime changes.

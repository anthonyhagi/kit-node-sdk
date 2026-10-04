---
"@anthonyhagi/kit-node-sdk": patch
---

Send `email_address` as an encoded query parameter in `tags.removeSubscriberByEmail()` instead of a JSON DELETE body, matching the Kit API contract.

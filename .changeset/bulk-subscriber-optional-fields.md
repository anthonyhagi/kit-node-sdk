---
"@anthonyhagi/kit-node-sdk": patch
---

Align bulk subscriber request fields with Kit's schema: first_name, email_address, and state are optional and nullable. Missing or invalid email addresses remain subject to the API's per-subscriber failures.

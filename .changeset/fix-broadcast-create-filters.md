---
"@anthonyhagi/kit-node-sdk": patch
---

Accept the API's array of subscriber filter groups in `broadcasts.create()` and wrap existing single-object filters in an array before sending. Preserve null filters and support `all`, `any`, and `none` groups without requiring unused fields.

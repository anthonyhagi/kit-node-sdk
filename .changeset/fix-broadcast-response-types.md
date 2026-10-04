---
"@anthonyhagi/kit-node-sdk": patch
---

Correct broadcast response types to include lifecycle `status` and shared subscriber filter groups supporting `all`, `any`, and `none`. The default `all_subscribers` filter no longer requires IDs, and targeted filters in get responses expose their IDs. Slim list responses also include status. Consumers constructing typed broadcast fixtures must now provide status and check for missing or null filter groups before accessing them.

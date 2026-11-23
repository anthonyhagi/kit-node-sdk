---
"@anthonyhagi/kit-node-sdk": minor
---

Expose broadcast A/B test metadata. Broadcast list, get, create and update responses include optional, nullable `ab_test` with its `type` (`subject` or `content`) and ordered `variants`; `BroadcastAbTest` and `BroadcastAbTestVariant` are exported. Document that on a subject-line test an update's `subject` replaces only the first variant and `preview_text` is saved but not sent.

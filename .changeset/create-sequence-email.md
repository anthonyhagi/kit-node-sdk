---
"@anthonyhagi/kit-node-sdk": minor
---

Add `kit.sequenceEmails.create(sequenceId, params)` with exported request and response types for creating draft or published sequence emails.

Correct sequence email response types to allow null content and preview text for drafts, and null sending days for hour-based emails. Callers accessing these fields should handle null values.

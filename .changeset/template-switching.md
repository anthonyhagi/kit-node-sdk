---
"@anthonyhagi/kit-node-sdk": minor
---

Support Kit's template-switching and sequence-email draft changes. Broadcast and sequence-email updates accept `allow_content_loss` to confirm a template change that would discard content (Kit otherwise returns 409). All `UpdateBroadcastParams` fields are now optional, so updates can send only what changes; omitted or null `email_template_id` keeps the current template. Sequence-email responses expose optional `has_unpublished_changes`. `allow_starting_point` is deprecated because Starting point templates now accept supplied HTML directly; it is still sent when provided.

---
"@anthonyhagi/kit-node-sdk": minor
---

Add `sequences.delete(id)` for soft-deleting a sequence with a bodyless DELETE request. Return an empty object for successful 204 responses and null for missing sequences, following the SDK's existing deletion conventions.

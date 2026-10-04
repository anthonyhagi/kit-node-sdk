---
"@anthonyhagi/kit-node-sdk": minor
---

Add `sequences.update(id, params)` with partial sequence settings, returning the updated details or null for a missing sequence. Export `UpdateSequence` and `UpdateSequenceParams`, reusing the existing creation settings and response model. Supplied false flags, midnight send hours, and empty exclusions are preserved; omitted settings are left to Kit unchanged.

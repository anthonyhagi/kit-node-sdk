---
"@anthonyhagi/kit-node-sdk": minor
---

Add `include: "stats"` support to `sequences.list()` and expose optional sequence settings, schedules, exclusions, counts, and stats through the exported `SequenceListItem` type. Reuse the sequence detail and stats types while preserving existing list fixtures and calls. Explicit `include_total_count: false` is now sent in the query.

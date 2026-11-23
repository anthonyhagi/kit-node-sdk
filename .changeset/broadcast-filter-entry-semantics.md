---
"@anthonyhagi/kit-node-sdk": patch
---

Document Kit's broadcast filter entry semantics: each entry matches any of its `ids`, and separate entries under `all` must all match. Use one entry per tag or segment to require several; existing `all` filters that list several IDs in one entry match any of them. No runtime or type-shape changes.

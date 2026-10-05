---
"@anthonyhagi/kit-node-sdk": patch
---

Fix low-level request query merging when the path already contains query parameters or a fragment. Additional parameters now append to the existing query before the fragment, preserving repeated keys and correctly encoding values.

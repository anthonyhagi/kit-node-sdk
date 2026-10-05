---
"@anthonyhagi/kit-node-sdk": patch
---

Make purchase response sources optional for list, get, and create responses to match Kit's API schema. Callers should check whether `source` is present before using it.

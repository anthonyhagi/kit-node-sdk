---
"@anthonyhagi/kit-node-sdk": patch
---

Allow a null position in sequence email creation responses to match Kit's API schema. Callers should check for null before using the returned position as a number.

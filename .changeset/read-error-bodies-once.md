---
"@anthonyhagi/kit-node-sdk": patch
---

Read HTTP error response bodies once without cloning them, preserving existing JSON and raw text error details while avoiding an unread buffered stream.

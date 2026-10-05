---
"@anthonyhagi/kit-node-sdk": patch
---

Fix request header overrides to replace default and authentication headers regardless of casing. Lowercase or mixed-case overrides no longer combine values such as Content-Type or Authorization with the original header.

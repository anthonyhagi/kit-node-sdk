---
"@anthonyhagi/kit-node-sdk": patch
---

Resolved various issues related to the main api client:

- Added test cases to ensure retry logic works as expected.
- Added test cases to ensure retry configuration is respected.
- Resolved a bug when a JSON body was unable to be parsed, the body was attempted to be parsed again as text.

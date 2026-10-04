---
"@anthonyhagi/kit-node-sdk": patch
---

Format `Date` inputs to `accounts.getGrowthStats()` as UTC calendar dates (`YYYY-MM-DD`) instead of full timestamps, matching the Kit API contract. Date strings and timestamp formatting on other endpoints remain unchanged.

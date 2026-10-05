---
"@anthonyhagi/kit-node-sdk": patch
---

Infer full and slim subscriber-list responses from the slim parameter. Full requests expose required custom field values through ListFullSubscribers, while slim and dynamic requests allow omitted fields. Export ListSlimSubscribers and retain the existing broad ListSubscribers type for compatibility.

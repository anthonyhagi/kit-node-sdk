# API resources

[Documentation index](README.md) · [Project overview](../README.md)

The SDK is structured to mirror the [Kit.com API v4](https://developers.kit.com/v4) endpoints. Each resource is accessible through the main `Kit` instance:

## Available Resources

| Resource                 | Description                                                        | Key Methods                                                                              |
| ------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **`kit.accounts`**       | Account and user information, creator profiles, email/growth stats | `getCurrentAccount()`, `getEmailStats()`, `getGrowthStats()`                             |
| **`kit.broadcasts`**     | One-off emails sent to subscribers                                 | `list()`, `create()`, `update()`, `getStats()`                                           |
| **`kit.customFields`**   | Additional fields for subscriber profiles and forms                | `list()`, `create()`, `update()`, `bulkCreate()`                                         |
| **`kit.emailTemplates`** | Pre-designed email layouts                                         | `list()`                                                                                 |
| **`kit.forms`**          | Web forms for collecting subscriber information                    | `list()`, `addSubscriber()`, `addSubscriberByEmail()`, `listSubscribers()`               |
| **`kit.purchases`**      | Transaction records for products/services                          | `list()`, `create()`, `get()`                                                            |
| **`kit.segments`**       | Dynamic subscriber groups based on criteria                        | `list()`                                                                                 |
| **`kit.sequences`**      | Automated email series                                             | `list()`, `addSubscriberById()`, `addSubscriberByEmail()`, `listSubscribers()`           |
| **`kit.subscribers`**    | Individual email recipients                                        | `list()`, `create()`, `get()`, `update()`, `bulkCreate()`, `getTags()`                   |
| **`kit.tags`**           | Labels for categorizing subscribers                                | `list()`, `create()`, `update()`, `bulkCreate()`, `tagSubscriber()`, `listSubscribers()` |
| **`kit.webhooks`**       | HTTP callbacks for real-time notifications                         | `list()`, `create()`                                                                     |

See [Examples](examples.md) for subscriber, tag, form, and sequence operations.

## Broadcast stats pagination

`kit.broadcasts.getAllStats()` returns one page of stats (500 broadcasts by
default, up to 1000 per page). Pass `after` or `before` to retrieve another page.
You can also filter by `status`, `sent_after`, and `sent_before`:

```typescript
const firstPage = await kit.broadcasts.getAllStats({
  per_page: 100,
  status: "completed",
  sent_after: "2026-01-01",
  sent_before: "2026-02-01",
  include_total_count: true,
});

if (firstPage.pagination.has_next_page && firstPage.pagination.end_cursor) {
  const nextPage = await kit.broadcasts.getAllStats({
    after: firstPage.pagination.end_cursor,
    per_page: 100,
    status: "completed",
    sent_after: "2026-01-01",
    sent_before: "2026-02-01",
  });
}
```

Keep the same filters when paging. Requesting the total count can slow responses,
so request it on the first page and reuse it. Existing calls without arguments
continue to work. See the [Kit API reference](https://developers.kit.com/api-reference/broadcasts/get-stats-for-a-list-of-broadcasts)
for the endpoint contract.

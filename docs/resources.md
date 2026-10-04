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

## Broadcast creation filters

Use an array of filter groups when creating a targeted broadcast. Kit supports
one filter group type per request: `all` (AND), `any` (OR), or `none` (NOT).
For example, this creates a draft for subscribers with either of two tags:

```typescript
const broadcast = await kit.broadcasts.create({
  subject: "Newsletter",
  content: "<p>Our latest news</p>",
  description: "Monthly update",
  preview_text: "Catch up with us",
  public: false,
  published_at: "2026-01-01T12:00:00Z",
  send_at: null,
  subscriber_filter: [{ any: [{ type: "tag", ids: [7, 8] }] }],
});
```

Use `type: "segment"` to target segment IDs. Existing single-object filters are
also accepted and wrapped in an array before sending. A `null` filter is passed
through unchanged. See the [Kit API reference](https://developers.kit.com/api-reference/broadcasts/create-a-broadcast).

## Broadcast list filters

Filter `kit.broadcasts.list()` by lifecycle `status` (`draft`, `scheduled`,
`sending`, `completed`, or `aborted`) and sent dates in `YYYY-MM-DD` format.
These filters can be combined with cursor pagination:

```typescript
const filters = {
  status: "completed" as const,
  sent_after: "2026-01-01",
  sent_before: "2026-02-01",
  per_page: 100,
};
const firstPage = await kit.broadcasts.list(filters);

if (firstPage.pagination.has_next_page && firstPage.pagination.end_cursor) {
  const nextPage = await kit.broadcasts.list({
    ...filters,
    after: firstPage.pagination.end_cursor,
  });
}
```

Keep the same filters on subsequent pages. All filters are optional; calls
without arguments continue to work. See the [Kit API reference](https://developers.kit.com/api-reference/broadcasts/list-broadcasts).

## Slim broadcast lists

Use `slim: true` when you only need broadcast metadata. Kit omits `content`,
`public_url`, `email_address`, `email_template`, and `subscriber_filter` for a
smaller, faster response:

```ts
const page = await kit.broadcasts.list({ slim: true, per_page: 25 });
for (const broadcast of page.broadcasts) {
  console.log(broadcast.id, broadcast.subject);
}
```

Literal `slim: true` calls return `ListSlimBroadcasts`. Calls without `slim`, or
with `slim: false`, return `ListBroadcasts`. A runtime boolean returns a union
of both types; check for a full-response field before accessing it:

```ts
const page = await kit.broadcasts.list({ slim: useSlim }); // useSlim: boolean
for (const broadcast of page.broadcasts) {
  if ("content" in broadcast) {
    console.log(broadcast.content);
  }
}
```

Slim responses retain pagination and support the same list filters. See the
[Kit API reference](https://developers.kit.com/api-reference/broadcasts/list-broadcasts).

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

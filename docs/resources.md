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

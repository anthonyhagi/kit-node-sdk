# Examples

[Documentation index](README.md) · [Project overview](../README.md)

## Pagination and basic resource operations

```typescript
import { Kit } from "@anthonyhagi/kit-node-sdk";

const kit = new Kit({ apiKey: "YOUR_API_KEY" });

// With custom retry configuration
const kitWithRetries = new Kit({
  apiKey: "YOUR_API_KEY",
  maxRetries: 5, // Retry up to 5 times (default: 3)
  retryDelay: 2000, // Start with 2 second delay (default: 1000ms)
});

// Get current account information
const myAccount = await kit.accounts.getCurrentAccount();
console.log(`Account: ${myAccount.account.name}`);

// Get the first page of subscribers
const subscribers = await kit.subscribers.list({
  per_page: 25,
});

// Get the next page using the response cursor
if (subscribers.pagination.has_next_page && subscribers.pagination.end_cursor) {
  const nextPage = await kit.subscribers.list({
    after: subscribers.pagination.end_cursor,
    per_page: 25,
  });
  console.log(nextPage.subscribers);
}

// Create a new tag
const newTag = await kit.tags.create({
  name: "Newsletter Subscribers",
});

// Create a subscriber, then add them to an existing form
const newSubscriber = await kit.subscribers.create({
  email_address: "user@example.com",
});
const formId = 123; // Replace with your form's numeric ID
await kit.forms.addSubscriber(formId, newSubscriber.subscriber.id);
```

Unless shown otherwise, the TypeScript snippets below assume you have imported
`Kit` and initialized `const kit = new Kit({ apiKey: "YOUR_API_KEY" })` as in
[Getting started](getting-started.md). Replace example IDs with the numeric IDs from your account.

See [Data consistency](data-consistency.md) when reading subscriber lists or
counts after a write. The guide shows how to use returned IDs for subsequent
operations.

## Working with Subscribers

`kit.subscribers.create()` matches subscribers by email address. It creates a new
subscriber or updates an existing subscriber's first name. Its `state` option
applies only to new subscribers; it cannot change an existing subscriber's state.
For example, passing `state: "active"` does not reactivate a cancelled subscriber.
See the [Kit API reference](https://developers.kit.com/api-reference/subscribers/create-a-subscriber).

```typescript
// Create a subscriber or update the first name for this email
const newSubscriber = await kit.subscribers.create({
  email_address: "john@example.com",
  first_name: "John",
});

for (const key of newSubscriber.warnings ?? []) {
  console.warn("Custom field key was ignored:", key);
}

// The company custom field must already exist; use its key, not its label.
// Update subscriber information
const updatedSubscriber = await kit.subscribers.update(
  newSubscriber.subscriber.id,
  {
    email_address: newSubscriber.subscriber.email_address,
    first_name: "Johnny",
    fields: {
      company: "Acme Corp",
    },
  }
);

for (const key of updatedSubscriber.warnings ?? []) {
  console.warn("Custom field key was ignored:", key);
}

// Get subscriber with their tags
const subscriber = await kit.subscribers.get(newSubscriber.subscriber.id);
const subscriberTags = await kit.subscribers.getTags(
  newSubscriber.subscriber.id
);
```

## Managing Tags and Segments

```typescript
// Bulk create tags
await kit.tags.bulkCreate({
  tags: [
    { name: "VIP Customer" },
    { name: "Early Adopter" },
    { name: "Beta Tester" },
  ],
});

// List all segments
const segments = await kit.segments.list();

// Create a tag, then apply it to an existing subscriber by email
const newsletterTag = await kit.tags.create({ name: "Newsletter Subscriber" });
await kit.tags.tagSubscriberByEmail(newsletterTag.tag.id, {
  email_address: "user@example.com",
});
```

## Working with Forms and Sequences

```typescript
// List all forms
const forms = await kit.forms.list();

// The subscriber must exist before being added to a form or sequence
const newSubscriber = await kit.subscribers.create({
  email_address: "subscriber@example.com",
  first_name: "Jane",
});
const formId = 123;
await kit.forms.addSubscriberByEmail(formId, {
  email_address: newSubscriber.subscriber.email_address,
});

// List sequences and add subscriber
const sequences = await kit.sequences.list();
const sequenceId = 456;
await kit.sequences.addSubscriberByEmail(sequenceId, {
  email_address: newSubscriber.subscriber.email_address,
});
```

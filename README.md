# Kit.com SDK for Node (Unofficial)

An unofficial Node.js SDK for interacting with the Kit.com API. This SDK aims to provide a
convenient and simple way for Node.js developers to integrate with Kit.com services.

**Note:** This is an unofficial SDK and is not maintained or endorsed by Kit.com.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Requirements](#requirements)
- [Usage](#usage)
  - [Basic Usage (TypeScript/ESM)](#basic-usage-typescriptesm)
  - [CommonJS Usage](#commonjs-usage)
  - [Advanced Examples](#advanced-examples)
- [API Documentation](#api-documentation)
  - [Available Resources](#available-resources)
  - [Authentication](#authentication)
  - [Environment Variables](#environment-variables)
  - [Error Handling](#error-handling)
  - [Rate Limiting](#rate-limiting)
  - [TypeScript Support](#typescript-support)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Available Scripts](#available-scripts)
  - [Testing](#testing)
  - [Contributing](#contributing)
  - [Code Quality](#code-quality)
- [License](#license)
- [Disclaimer](#disclaimer)

## Features

- Easy integration with Node.js applications.
- Promise-based API for asynchronous operations.
- Built-in retry logic with exponential backoff for transient failures.
- Configurable retry behavior and error handling.

## Installation

You can install the SDK using npm:

```bash
npm install @anthonyhagi/kit-node-sdk
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for TypeScript projects)

## Usage

The SDK is fully typed and supports both TypeScript and JavaScript. Here are examples for different use cases:

### Basic Usage (TypeScript/ESM)

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

### CommonJS Usage

```javascript
const { Kit } = require("@anthonyhagi/kit-node-sdk");

const kit = new Kit({ apiKey: process.env.KIT_API_KEY });

async function main() {
  try {
    const account = await kit.accounts.getCurrentAccount();
    console.log("Account loaded:", account.account.name);
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

main();
```

### Advanced Examples

Unless shown otherwise, the TypeScript snippets below assume you have imported
`Kit` and initialized `const kit = new Kit({ apiKey: "YOUR_API_KEY" })` as in the
basic example. Replace example IDs with the numeric IDs from your account.

#### Working with Subscribers

```typescript
// Create a new subscriber
const newSubscriber = await kit.subscribers.create({
  email_address: "john@example.com",
  first_name: "John",
});

// Update subscriber information
await kit.subscribers.update(newSubscriber.subscriber.id, {
  email_address: newSubscriber.subscriber.email_address,
  first_name: "Johnny",
  fields: {
    company: "Acme Corp",
  },
});

// Get subscriber with their tags
const subscriber = await kit.subscribers.get(newSubscriber.subscriber.id);
const subscriberTags = await kit.subscribers.getTags(
  newSubscriber.subscriber.id
);
```

#### Managing Tags and Segments

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

#### Working with Forms and Sequences

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

## API Documentation

The SDK is structured to mirror the [Kit.com API v4](https://developers.kit.com/v4) endpoints. Each resource is accessible through the main `Kit` instance:

### Available Resources

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

### Authentication

The SDK supports two authentication methods:

#### API Key (Default)

```typescript
const kit = new Kit({ apiKey: "your-api-key" });
```

#### OAuth Bearer Token

```typescript
const kit = new Kit({
  apiKey: "your-bearer-token",
  authType: "oauth",
});
```

#### Configuration Options

The Kit constructor accepts the following options:

```typescript
const kit = new Kit({
  apiKey: "your-api-key", // Optional if KIT_API_KEY is set
  authType: "apikey", // Optional: "apikey" (default) or "oauth"
  maxRetries: 3, // Optional: Retry attempts; 0 disables retries (default: 3)
  retryDelay: 1000, // Optional: Base delay; 0 skips the wait (default: 1000ms)
});
```

### Environment Variables

You can set your API key as an environment variable:

```bash
export KIT_API_KEY="your-api-key"
```

Then initialize without passing the key:

```typescript
const kit = new Kit(); // Uses KIT_API_KEY from environment
```

### Error Handling

The SDK provides robust error handling with automatic retry logic for transient failures:

#### Automatic Retries

The SDK automatically retries requests for:

- **5xx server errors** (500, 502, 503, etc.) - Transient server issues
- **429 rate limiting** - Too many requests
- **Network errors** - Failures of the fetch request

**Non-retryable errors** (handled immediately):

- **4xx client errors** (400, 401, 403, 404, 422) - These indicate client-side issues

A 404 response returns `null`. Other non-retryable client errors throw.
Empty successful response bodies return `{}`. Errors reading or parsing a
successful response body throw without repeating the request.

#### Exponential Backoff

Retries use exponential backoff with jitter to prevent overwhelming servers:

- 1st retry: ~1 second delay
- 2nd retry: ~2 seconds delay
- 3rd retry: ~4 seconds delay
- Each with ±12.5% randomization to prevent thundering herd

#### Error Handling Example

```typescript
try {
  const account = await kit.accounts.getCurrentAccount();
  console.log(account);
} catch (error) {
  console.error(
    "API Error:",
    error instanceof Error ? error.message : String(error)
  );
  // Retryable failures throw after exhausting the configured attempts.
  // Client errors and response parsing failures throw without retries.
}
```

#### Custom Retry Configuration

```typescript
// Aggressive retry strategy for critical operations
const kit = new Kit({
  apiKey: "your-api-key",
  maxRetries: 5, // Retry up to 5 times
  retryDelay: 2000, // Start with 2 second delays
});

// Conservative strategy for less critical operations
const kitConservative = new Kit({
  apiKey: "your-api-key",
  maxRetries: 1, // Only retry once
  retryDelay: 500, // Quick retries
});
```

### Rate Limiting

The SDK automatically handles rate limiting (HTTP 429) responses with exponential backoff retries. When you encounter rate limits, the SDK will:

1. **Automatically retry** the request after a delay
2. **Use exponential backoff** to progressively increase wait times
3. **Add jitter** to prevent multiple clients from retrying simultaneously
4. **Respect your configured retry limits**

```typescript
// The SDK handles this automatically
const subscribers = await kit.subscribers.list();
// If rate limited, this will retry up to 3 times with increasing delays
```

For high-volume applications, consider:

- Implementing request queuing in your application
- Using larger retry delays: `retryDelay: 5000`
- Increasing retry attempts: `maxRetries: 5`
- Monitoring your retry patterns and adjusting configuration as needed

### TypeScript Support

This SDK is written in TypeScript and provides full type definitions. All API responses, parameters, and options are fully typed:

```typescript
import {
  Kit,
  type CreateSubscriberParams,
  type GetCurrentAccount,
} from "@anthonyhagi/kit-node-sdk";

const kit = new Kit({ apiKey: "YOUR_API_KEY" });

// Full type safety for responses
const account: GetCurrentAccount = await kit.accounts.getCurrentAccount();

// Type-safe parameter objects
const subscriberParams: CreateSubscriberParams = {
  email_address: "user@example.com",
  first_name: "John",
};

const subscriber = await kit.subscribers.create(subscriberParams);
```

For JavaScript projects, the types are available for IDEs that support TypeScript declarations, providing autocomplete and inline documentation.

> **Note:** The SDK provides maintained TypeScript definitions for its supported
> Kit.com API v4 endpoints. Responses are not validated at runtime.

## Development

### Prerequisites

- Node.js 24 (see `.nvmrc`; current development tools require Node.js >= 24.11)
- npm or equivalent package manager

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/anthonyhagi/kit-node-sdk.git
   cd kit-node-sdk
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Available Scripts

- `npm run build` - Build the TypeScript code using tsdown
- `npm run clean` - Remove the dist directory
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Lint code with ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run the test suite with Vitest
- `npm run changeset` - Create a changeset for version management

### Testing

The project uses [Vitest](https://vitest.dev/) for testing with fetch mocking capabilities.

#### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (during development)
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

#### Test Structure

Tests are co-located with source files using the `.test.ts` suffix. The test suite includes:

- Unit tests for API client functionality
- Mock HTTP responses using `vitest-fetch-mock`
- Type safety validation
- Utility function testing

#### Writing Tests

When adding new features, include corresponding test files. For example, after
`npm run build`, this test checks the public package interface using the project's
configured fetch mock:

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { Kit } from "@anthonyhagi/kit-node-sdk";

describe("accounts", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("returns the account response", async () => {
    const response = { account: { name: "Test account" } };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const kit = new Kit({ apiKey: "test-key" });
    const result = await kit.accounts.getCurrentAccount();

    expect(result).toEqual(response);
  });
});
```

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

### Code Quality

The project maintains high code quality through:

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Vitest** for comprehensive testing
- **Changesets** for version management

Before submitting changes:

```bash
npm run lint      # Check for linting issues
npm run format    # Format code
npm run typecheck # Verify TypeScript types
npm run test      # Run test suite
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This is an unofficial SDK. Use at your own risk. Ensure you comply with Kit.com's Terms of Service and API usage policies when using this SDK.

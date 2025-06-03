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

// Get current account information
const myAccount = await kit.accounts.getCurrentAccount();
console.log(`Account: ${myAccount.name}`);

// List all subscribers with pagination
const subscribers = await kit.subscribers.list({ 
  page: 1,
  per_page: 25 
});

// Create a new tag
const newTag = await kit.tags.create({ 
  name: "Newsletter Subscribers" 
});

// Add a subscriber to a form
await kit.forms.addSubscriber({
  id: "form_id",
  email: "user@example.com",
});
```

### CommonJS Usage

```javascript
const { Kit } = require("@anthonyhagi/kit-node-sdk");

const kit = new Kit({ apiKey: process.env.KIT_API_KEY });

async function main() {
  try {
    const account = await kit.accounts.getCurrentAccount();
    console.log('Account loaded:', account.name);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### Advanced Examples

#### Working with Subscribers

```typescript
// Create a new subscriber
const newSubscriber = await kit.subscribers.create({
  email: "john@example.com",
  first_name: "John",
  tags: ["customer", "premium"]
});

// Update subscriber information
await kit.subscribers.update({
  id: newSubscriber.id,
  first_name: "Johnny",
  custom_fields: {
    company: "Acme Corp"
  }
});

// Get subscriber with their tags
const subscriber = await kit.subscribers.get({ id: newSubscriber.id });
const subscriberTags = await kit.subscribers.getTags({ 
  subscriberId: newSubscriber.id 
});
```

#### Managing Tags and Segments

```typescript
// Bulk create tags
await kit.tags.bulkCreate({
  tags: [
    { name: "VIP Customer" },
    { name: "Early Adopter" },
    { name: "Beta Tester" }
  ]
});

// List all segments
const segments = await kit.segments.list();

// Tag a subscriber by email
await kit.tags.tagSubscriberByEmail({
  email: "user@example.com",
  tag: { name: "Newsletter Subscriber" }
});
```

#### Working with Forms and Sequences

```typescript
// List all forms
const forms = await kit.forms.list();

// Add subscriber to a form by email
await kit.forms.addSubscriberByEmail({
  id: "form_123",
  email: "subscriber@example.com",
  first_name: "Jane"
});

// List sequences and add subscriber
const sequences = await kit.sequences.list();
await kit.sequences.addSubscriberByEmail({
  sequenceId: "seq_456",
  email: "subscriber@example.com"
});
```

## API Documentation

The SDK is structured to mirror the [Kit.com API v4](https://developers.kit.com/v4) endpoints. Each resource is accessible through the main `Kit` instance:

### Available Resources

| Resource | Description | Key Methods |
|----------|-------------|-------------|
| **`kit.accounts`** | Account and user information, creator profiles, email/growth stats | `getCurrentAccount()`, `getEmailStats()`, `getGrowthStats()` |
| **`kit.broadcasts`** | One-off emails sent to subscribers | `list()`, `create()`, `update()`, `getStats()` |
| **`kit.customFields`** | Additional fields for subscriber profiles and forms | `list()`, `create()`, `update()`, `bulkCreate()` |
| **`kit.emailTemplates`** | Pre-designed email layouts | `list()` |
| **`kit.forms`** | Web forms for collecting subscriber information | `list()`, `addSubscriber()`, `addSubscriberByEmail()`, `listSubscribers()` |
| **`kit.purchases`** | Transaction records for products/services | `list()`, `create()`, `get()` |
| **`kit.segments`** | Dynamic subscriber groups based on criteria | `list()` |
| **`kit.sequences`** | Automated email series | `list()`, `addSubscriber()`, `addSubscriberByEmail()`, `listSubscribers()` |
| **`kit.subscribers`** | Individual email recipients | `list()`, `create()`, `get()`, `update()`, `bulkCreate()`, `getTags()` |
| **`kit.tags`** | Labels for categorizing subscribers | `list()`, `create()`, `update()`, `bulkCreate()`, `tagSubscriber()`, `listSubscribers()` |
| **`kit.webhooks`** | HTTP callbacks for real-time notifications | `list()`, `create()` |

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
  authType: "oauth" 
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

The SDK will throw errors for invalid requests. Always wrap API calls in try-catch blocks:

```typescript
try {
  const account = await kit.accounts.getCurrentAccount();
  console.log(account);
} catch (error) {
  console.error('API Error:', error.message);
}
```

### Rate Limiting

Please be mindful of Kit.com's API rate limits. The SDK does not implement automatic retry logic, so you may need to handle rate limiting in your application.

### TypeScript Support

This SDK is written in TypeScript and provides full type definitions. All API responses, parameters, and options are fully typed:

```typescript
import { Kit, type GetCurrentAccount, type CreateSubscriberParams } from "@anthonyhagi/kit-node-sdk";

const kit = new Kit({ apiKey: "YOUR_API_KEY" });

// Full type safety for responses
const account: GetCurrentAccount = await kit.accounts.getCurrentAccount();

// Type-safe parameter objects
const subscriberParams: CreateSubscriberParams = {
  email: "user@example.com",
  first_name: "John",
  tags: ["customer"]
};

const subscriber = await kit.subscribers.create(subscriberParams);
```

For JavaScript projects, the types are available for IDEs that support TypeScript declarations, providing autocomplete and inline documentation.

> **Note:** All exported types follow the Kit.com API v4 specification and are automatically generated from the API responses to ensure accuracy and up-to-date type definitions.

## Development

### Prerequisites

- Node.js >= 18.0.0
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

When adding new features, include corresponding test files:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Kit } from '../src';

describe('MyFeature', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('should work correctly', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
    
    const kit = new Kit({ apiKey: 'test-key' });
    const result = await kit.myFeature.doSomething();
    
    expect(result).toEqual({ success: true });
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

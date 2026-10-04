# Getting started

[Documentation index](README.md) · [Project overview](../README.md)

## Installation

You can install the SDK using npm:

```bash
npm install @anthonyhagi/kit-node-sdk
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0 (for TypeScript projects)

## Basic usage (TypeScript/ESM)

```typescript
import { Kit } from "@anthonyhagi/kit-node-sdk";

const kit = new Kit({ apiKey: "YOUR_API_KEY" });
const response = await kit.accounts.getCurrentAccount();
console.log(response.account.name);
```

For authentication and retry options, see [Configuration](configuration.md).
For pagination and resource operations, see [Examples](examples.md).

## CommonJS usage

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

## TypeScript support

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

# Kit.com SDK for Node (Unofficial)

An unofficial Node.js SDK for interacting with the Kit.com API. This SDK aims to provide a
convenient and simple way for Node.js developers to integrate with Kit.com services.

**Note:** This is an unofficial SDK and is not maintained or endorsed by Kit.com.

**Note:** This is NOT production ready nor is it published yet.

## Features

*   Easy integration with Node.js applications.
*   Promise-based API for asynchronous operations.

## Installation

You can install the SDK using npm:

```bash
npm install @anthonyhagi/kit-node-sdk
```

## Usage

Here's a basic example of how to use the SDK with TypeScript and ESM imports:

```typescript
import { Kit } from '@anthonyhagi/kit-node-sdk';

const kit = new KitSDK({ apiKey: 'YOUR_API_KEY' });

const myAccount = await kit.accounts.getCurrentAccount();
```

## API Documentation

The SDK is structured to mirror the Kit.com API endpoints. You will typically interact with different modules corresponding to API resources (e.g., `kit.products`, `kit.orders`, etc.) — more coming soon on this.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This is an unofficial SDK. Use at your own risk. Ensure you comply with Kit.com's Terms of Service and API usage policies when using this SDK.

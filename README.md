# Kit.com SDK for Node (Unofficial)

An unofficial TypeScript/Node.js SDK for the Kit.com API v4. It provides typed
resource handlers, API key and OAuth bearer-token authentication, and configurable
retries for transient failures.

This project is not maintained or endorsed by Kit.com.

## Installation

```bash
npm install @anthonyhagi/kit-node-sdk
```

Requires Node.js >= 18.0.0. TypeScript projects require TypeScript >= 5.0.

## Quick start

```typescript
import { Kit } from "@anthonyhagi/kit-node-sdk";

const kit = new Kit({ apiKey: "YOUR_API_KEY" });
const response = await kit.accounts.getCurrentAccount();
console.log(response.account.name);
```

You can also set `KIT_API_KEY` and initialize with `new Kit()`.

## Documentation

See the [documentation index](docs/README.md) for the complete guides:

- [Getting started](docs/getting-started.md): installation, CommonJS, and TypeScript.
- [Configuration](docs/configuration.md): authentication, environment variables, and client options.
- [API resources](docs/resources.md): supported resources and methods.
- [Examples](docs/examples.md): pagination, subscribers, tags, forms, and sequences.
- [Errors, retries, and rate limits](docs/error-handling.md): response handling and retry behavior.

## Contributing and license

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup, scripts, and testing, and read
[CONTRIBUTING.md](CONTRIBUTING.md) before contributing. This project is
licensed under the [MIT License](LICENSE).

Use this unofficial SDK in accordance with Kit.com's terms and API policies.

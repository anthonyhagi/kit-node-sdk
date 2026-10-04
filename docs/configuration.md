# Configuration

[Documentation index](README.md) · [Project overview](../README.md)

## Authentication

Import the client before using the snippets below:

```typescript
import { Kit } from "@anthonyhagi/kit-node-sdk";
```

The SDK supports two authentication methods:

### API Key (Default)

```typescript
const kit = new Kit({ apiKey: "your-api-key" });
```

### OAuth Bearer Token

```typescript
const kit = new Kit({
  apiKey: "your-bearer-token",
  authType: "oauth",
});
```

### Configuration Options

The Kit constructor accepts the following options:

```typescript
const kit = new Kit({
  apiKey: "your-api-key", // Optional if KIT_API_KEY is set
  authType: "apikey", // Optional: "apikey" (default) or "oauth"
  maxRetries: 3, // Optional: Retry attempts; 0 disables retries (default: 3)
  retryDelay: 1000, // Optional: Base delay; 0 skips the wait (default: 1000ms)
});
```

## Environment Variables

You can set your API key as an environment variable:

```bash
export KIT_API_KEY="your-api-key"
```

Then initialize without passing the key:

```typescript
const kit = new Kit(); // Uses KIT_API_KEY from environment
```

See [Errors, retries, and rate limits](error-handling.md) for request behavior.

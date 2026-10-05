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

### Disconnecting an OAuth App

Use the exported `revokeOAuthToken()` helper when a creator disconnects your app:

```typescript
import { revokeOAuthToken } from "@anthonyhagi/kit-node-sdk";

await revokeOAuthToken({
  token: accessToken,
  client_id: clientId,
  client_secret: clientSecret,
  token_type_hint: "access_token", // Optional; refresh_token is also supported
});
```

Both access tokens and refresh tokens are accepted. Kit revokes associated tokens
and disables the matching plugin authorization. An unknown, expired, or already
revoked token also receives a successful response. The helper resolves to `void`
and can be used without constructing a `Kit` client.

The helper makes one request. HTTP failures throw `ApiError` with `status` and
`details`; network failures propagate. Its optional second argument accepts
`{ baseUrl }` to override the default `https://api.kit.com/v4` endpoint.

See [Kit's token revocation documentation](https://developers.kit.com/api-reference/oauth-token-revocation).

### Configuration Options

The Kit constructor accepts the following options:

```typescript
const kit = new Kit({
  apiKey: "your-api-key", // Optional if KIT_API_KEY is set
  authType: "apikey", // Optional: "apikey" (default) or "oauth"
  maxRetries: 3, // Optional: Retry attempts; 0 disables retries (default: 3)
  retryDelay: 1000, // Optional: Base delay; 0 disables backoff (default: 1000ms)
  timeoutMs: 10000, // Optional: Timeout per attempt; defaults to 0 (disabled)
});
```

Retryable responses with a valid `Retry-After` header wait at least as long
as the server requests, even when `retryDelay` is `0`.

`maxRetries` must be a non-negative safe integer. `retryDelay` must be a finite
non-negative number; fractional milliseconds are accepted. Invalid values throw
a `RangeError` when constructing the client. Omitted or `undefined` options use
the defaults, and both options accept `0`.

`timeoutMs` limits each attempt, including response body reading. Omit it or set
it to `0` to disable the timeout. It must be an integer from `0` to `2147483647`
milliseconds; invalid values throw a `RangeError` at construction. Retry delays
are excluded, so the entire call can take longer than one attempt's timeout.

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

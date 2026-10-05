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

### Building an Authorization URL

Build the initial redirect URL with the client ID and an app-configured redirect URI:

```typescript
import { buildOAuthAuthorizationUrl } from "@anthonyhagi/kit-node-sdk";

const authorizationUrl = buildOAuthAuthorizationUrl({
  client_id: clientId,
  redirect_uri: "https://example.com/oauth/callback",
  state: savedState,
});
// Redirect the creator to authorizationUrl.
```

The helper encodes query values and sets `response_type=code`. Optional parameters
include `state`, `scope`, and `tenant_name`. Save the state with the authorization
session and validate it on the callback. The optional second argument accepts
`{ baseUrl }` to override `https://api.kit.com/v4`.

For PKCE, pass the generated challenge and method:

```typescript
import { generateOAuthPKCE } from "@anthonyhagi/kit-node-sdk";

const pkce = generateOAuthPKCE();
const authorizationUrl = buildOAuthAuthorizationUrl({
  client_id: clientId,
  redirect_uri: "https://example.com/oauth/callback",
  state: savedState,
  code_challenge: pkce.code_challenge,
  code_challenge_method: pkce.code_challenge_method,
});
// Save pkce.code_verifier for exchangeOAuthCode() at the callback.
```

`BuildOAuthAuthorizationUrlParams` requires both PKCE challenge fields together.
The verifier stays with your authorization session.

See [Kit's OAuth flow](https://developers.kit.com/api-reference/oauth-refresh-token-flow)
and [PKCE flow](https://developers.kit.com/api-reference/oauth-proof-key-for-code-exchange-flow).

### Exchanging an Authorization Code

After validating the OAuth callback's state, exchange its authorization code for tokens:

```typescript
import { exchangeOAuthCode, Kit } from "@anthonyhagi/kit-node-sdk";

const tokens = await exchangeOAuthCode({
  client_id: clientId,
  client_secret: clientSecret,
  code: authorizationCode,
  redirect_uri: "https://example.com/oauth/callback",
});

// Store tokens.refresh_token for future refreshes.
const kit = new Kit({ apiKey: tokens.access_token, authType: "oauth" });
```

Use the redirect URI from the authorization request, matching one configured in
your app. The helper accepts a client secret or PKCE verifier and returns
`OAuthTokenResponse`. It makes one request without automatic retries. HTTP failures
throw `ApiError` with `status` and `details`; network and JSON parsing failures
propagate. Its optional second argument accepts `{ baseUrl }` to override
`https://api.kit.com/v4`.

See [Kit's authorization-code flow](https://developers.kit.com/api-reference/oauth-refresh-token-flow).

### Exchanging a PKCE Authorization Code

Generate a fresh verifier and challenge before starting each authorization flow:

```typescript
import { generateOAuthPKCE } from "@anthonyhagi/kit-node-sdk";

const pkce = generateOAuthPKCE();
// Save pkce.code_verifier with this authorization session.
// Send pkce.code_challenge and pkce.code_challenge_method in the authorization URL.
```

The helper returns `OAuthPKCE` synchronously, using 32 cryptographically random
bytes for a 43-character verifier and a SHA-256, base64url challenge without padding.

For PKCE, supply the original verifier saved before the authorization redirect:

```typescript
const tokens = await exchangeOAuthCode({
  client_id: clientId,
  code: authorizationCode,
  redirect_uri: "https://example.com/oauth/callback",
  code_verifier: savedCodeVerifier,
});
```

`ExchangeOAuthCodeParams` requires either `client_secret` or `code_verifier`.
The verifier must be the same 43–128 character random string used to derive the
S256 challenge sent during authorization. The helper sends it unchanged and
returns `OAuthTokenResponse` using the same single-request behavior.

See [Kit's PKCE flow](https://developers.kit.com/api-reference/oauth-proof-key-for-code-exchange-flow).

### Refreshing OAuth Tokens

Use `refreshOAuthToken()` to obtain a new access token and replacement refresh token:

```typescript
import { Kit, refreshOAuthToken } from "@anthonyhagi/kit-node-sdk";

const tokens = await refreshOAuthToken({
  client_id: clientId,
  refresh_token: storedRefreshToken,
});

// Store tokens.refresh_token for the next refresh.
const kit = new Kit({ apiKey: tokens.access_token, authType: "oauth" });
```

The `OAuthTokenResponse` includes `access_token`, `token_type`, `expires_in`
(seconds), `refresh_token`, `scope`, and `created_at` (Unix seconds).

Refresh tokens are single-use. Save the returned replacement token before the next
refresh; reusing the submitted token returns `invalid_grant`. The helper makes one
request without automatic retries. HTTP failures throw `ApiError` with `status`
and `details`; network and JSON parsing failures propagate. An optional second
argument accepts `{ baseUrl }` to override `https://api.kit.com/v4`.

See [Kit's refresh-token flow](https://developers.kit.com/api-reference/oauth-refresh-token-flow).

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

### Cancelling OAuth requests

All three OAuth helpers accept an optional `signal` in their second argument, alongside
`baseUrl`. Use an `AbortController` to cancel a pending request or response read:

```typescript
const controller = new AbortController();
const pendingRefresh = refreshOAuthToken(
  { client_id: clientId, refresh_token: storedRefreshToken },
  { signal: controller.signal }
);

// Cancel when the caller no longer needs the result.
controller.abort();
await pendingRefresh; // Rejects with the signal's abort reason.
```

Cancellation propagates without retries. The same option is available on
`revokeOAuthToken(params, { signal: controller.signal })` and
`exchangeOAuthCode(params, { signal: controller.signal })`.

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

## Per-request retry limits

Pass `maxRetries` in a resource method's request options to override the client
limit for that call. It must be a non-negative safe integer; invalid values
reject before a request is sent. This leaves the client default unchanged:

```ts
const page = await kit.subscribers.list(undefined, { maxRetries: 0 });
console.log(page.subscribers);
```

Omitted or `undefined` request limits normally use the client limit.
`kit.purchases.create()` defaults to **zero retries**, including network failures,
timeouts, 5xx responses, and rate limits. Kit appends products when the transaction
already exists, so replaying a request after an uncertain outcome can duplicate
line items. Inspect the purchase before resending products. An explicit request
limit can opt into retries, for example `kit.purchases.create(params, { maxRetries: 1 })`;
do so only when you have established that replaying the request is appropriate.

`kit.sequenceEmails.create()` also defaults to zero retries. Replaying an
uncertain creation can add another email to the sequence; publishing it can
trigger sends. Inspect the sequence emails before attempting creation again.
An explicit `maxRetries` request option can opt into retries for this method.
See [Kit's sequence email behavior](https://developers.kit.com/api-reference/sequence-emails/create-a-sequence-email).

`kit.webhookEndpoints.rotateSecret()` defaults to zero retries, including when
`force: true` is supplied. After an uncertain successful rotation, replaying
normally returns `409`; forced replay rotates again and immediately expires the
older secret. The new plaintext secret is available only in the rotation
response. Inspect endpoint metadata before deciding how to recover, and avoid
forcing a second rotation just to bypass a conflict. An explicit `maxRetries`
request option can opt into retries. See [Kit's rotation behavior](https://developers.kit.com/api-reference/webhooks/rotate-a-webhook-endpoint-secret).

Other resource methods retain the client retry policy. See
[Kit's purchase behavior](https://developers.kit.com/api-reference/purchases/create-a-purchase).

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

# Errors, retries, and rate limits

[Documentation index](README.md) · [Project overview](../README.md)

These snippets assume `Kit` has been imported and `kit` initialized as shown
in [Getting started](getting-started.md).

The SDK provides robust error handling with automatic retry logic for transient failures:

## Automatic Retries

The SDK automatically retries requests for:

- **5xx server errors** (500, 502, 503, etc.) - Transient server issues
- **429 rate limiting** - Too many requests
- **Network errors** - Failures of the fetch request

**Non-retryable errors** (handled immediately):

- **4xx client errors** (400, 401, 403, 404, 422) - These indicate client-side issues

A 404 response returns `null`. Other non-retryable client errors throw.
Empty successful response bodies return `{}`. Errors reading or parsing a
successful response body throw without repeating the request.

## Exponential Backoff

Retries use exponential backoff with jitter to prevent overwhelming servers:

- 1st retry: ~1 second delay
- 2nd retry: ~2 seconds delay
- 3rd retry: ~4 seconds delay
- Each with ±12.5% randomization to prevent thundering herd

## Error Handling Example

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

## Custom Retry Configuration

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

## Rate Limiting

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

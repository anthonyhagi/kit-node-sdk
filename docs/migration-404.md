# Migrating 404 handling

[Documentation index](README.md) · [Error handling](error-handling.md)

All SDK requests now throw the exported `ApiError` for HTTP 404 responses.
Earlier versions returned `null`, even from methods whose TypeScript types
promised a non-null result. Bulk operations could then fail with a `TypeError`
while examining that null response.

This is a breaking change. Resource methods now return their successful response
without a top-level `| null` union. Nullable fields inside response objects are
unchanged. A 404 is never retried; the error retains `status` and the parsed JSON
or raw text response in `details`.

Replace checks for a null result with a catch where missing resources are expected:

```typescript
import { ApiError, Kit } from "@anthonyhagi/kit-node-sdk";

const kit = new Kit();
try {
  const result = await kit.broadcasts.get(123);
  console.log(result.broadcast.subject);
} catch (error) {
  if (error instanceof ApiError && error.status === 404) {
    console.log("Broadcast not found");
  } else {
    throw error;
  }
}
```

For writes, reaching the next statement means the operation succeeded. If absence
is acceptable when deleting, catch only `ApiError` with status 404 and propagate
other failures. Do not turn authentication, network, timeout, or parsing errors
into missing-resource results.

Successful empty responses keep their existing behavior in this change. Bulk
operations still return their synchronous results or asynchronous acknowledgement.

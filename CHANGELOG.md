# @anthonyhagi/kit-node-sdk

## 0.4.0

### Minor Changes

- 2e708d7: Add optional `status`, `sent_after`, and `sent_before` filters to `broadcasts.list()`. These filters can be combined with existing pagination options, and calls without arguments continue to work.
- d7e2fb6: Add `sequences.create()` with a required name and optional sending settings, schedule, activity flags, and subscriber exclusions. Export `CreateSequence`, `CreateSequenceParams`, and `SequenceSendDay`; reuse the sequence detail response fields.
- 0f3abad: Add `sequences.delete(id)` for soft-deleting a sequence with a bodyless DELETE request. Return an empty object for successful 204 responses and null for missing sequences, following the SDK's existing deletion conventions.
- 3de9775: Add `sequences.get(id, params)` for fetching sequence settings and schedules, with optional `include: "stats"` support. Export `GetSequence`, `GetSequenceParams`, and `SequenceStats`, including nullable deliverability metrics and optional counts. Missing sequences return null through the existing 404 handling.
- 49fca40: Add an optional `timeoutMs` client setting that aborts each request attempt, including response body reading. Timeouts default to disabled, fetch timeouts follow retry limits, and successful response body timeouts throw without repeating the operation.
- 2a39970: Add `slim` to `broadcasts.list()` with a `ListSlimBroadcasts` response type that omits expensive fields. Default and `slim: false` calls retain full response types; runtime boolean options return a union of both response types.
- 5e7925f: Export `ApiError` for unsuccessful HTTP responses, exposing the status code and parsed JSON or raw text details. Preserve existing error messages, 404 null responses, and network and successful response parsing errors.
- b11bd39: Add `sequences.update(id, params)` with partial sequence settings, returning the updated details or null for a missing sequence. Export `UpdateSequence` and `UpdateSequenceParams`, reusing the existing creation settings and response model. Supplied false flags, midnight send hours, and empty exclusions are preserved; omitted settings are left to Kit unchanged.
- b48612d: Add `include: "stats"` support to `sequences.list()` and expose optional sequence settings, schedules, exclusions, counts, and stats through the exported `SequenceListItem` type. Reuse the sequence detail and stats types while preserving existing list fixtures and calls. Explicit `include_total_count: false` is now sent in the query.
- 3250489: Add optional pagination, sent-date, and lifecycle status filters to `broadcasts.getAllStats()` so callers can retrieve stats beyond the first page. Existing calls without arguments continue to work.
- 83e2916: Add `kit.sequenceEmails.create(sequenceId, params)` with exported request and response types for creating draft or published sequence emails.

  Correct sequence email response types to allow null content and preview text for drafts, and null sending days for hour-based emails. Callers accessing these fields should handle null values.

- 4872956: Add `kit.sequenceEmails.delete(sequenceId, emailId)` to permanently remove a sequence email. Empty 204 responses return an empty object, and missing sequences or emails return null.
- 70bad0a: Add `sequenceEmails.get(sequenceId, emailId, params)` with optional `include: "stats"` and null-on-404 handling. Export `GetSequenceEmail` and `GetSequenceEmailParams`. Reuse the email metadata and stats types while making HTML content required for single-email responses.
- 788713b: Add `kit.sequenceEmails.list(sequenceId, params)` with cursor pagination, optional HTML content, and per-email stats. Export list parameters, response, item, and stats types. Missing sequences return null through the SDK's existing 404 handling.
- 6c2b6a6: Add optional pagination parameters to `broadcasts.getLinkClicksById()` so callers can retrieve subsequent pages of links and request total counts. Export `GetLinkClicksParams` and include the tracked link `id` in `BroadcastLinkClick`. Existing single-ID calls continue to work; typed link fixtures must now include `id`.
- b82ccd8: Add `kit.sequenceEmails.update(sequenceId, emailId, params)` with exported request and response types for partial content, timing, schedule, position, and publication updates.

### Patch Changes

- 12c02d2: Add `open_rate`, `click_rate`, `unsubscribe_rate`, and `bounce_rate` as numeric fields in `GetEmailStats.stats` to match the Kit API response.
- 118b665: Expose the numeric `subscriber_id` and string `source` fields in purchase list, get, and create response types, matching the Kit API responses.
- 383c5c0: Cancel discarded HTTP response bodies before waiting to retry rate-limit or server errors, releasing connection resources between attempts.
- 1b80596: Export `FilterSubscriberBody`, `FilterSubscriberParams`, and `FilterSubscribers` from the package entry point so consumers can import the named types used by `subscribers.filter()`.
- 52604b2: Export `GetSubscriberStats` and `GetSubscriberStatsParams` from the package entry point so consumers can import the named types used by `subscribers.getStats()`.
- eedf25f: Accept the API's array of subscriber filter groups in `broadcasts.create()` and wrap existing single-object filters in an array before sending. Preserve null filters and support `all`, `any`, and `none` groups without requiring unused fields.
- b1cdf4b: Correct the subscriber engagement filter discriminator from `broadcast` to `broadcasts` to match the Kit API. Broadcast filter callers should use `type: "broadcasts"`.
- 8a66324: Correct broadcast response types to include lifecycle `status` and shared subscriber filter groups supporting `all`, `any`, and `none`. The default `all_subscribers` filter no longer requires IDs, and targeted filters in get responses expose their IDs. Slim list responses also include status. Consumers constructing typed broadcast fixtures must now provide status and check for missing or null filter groups before accessing them.
- 5e2be6b: Send bulk tag creation requests to `/bulk/tags` instead of the subscriber tagging endpoint.
- bff9f7e: Correct `AddSubscriberToForm.subscriber.first_name` from `number` to `string` to match the Kit API response.
- ee0776a: Format `Date` inputs to `accounts.getGrowthStats()` as UTC calendar dates (`YYYY-MM-DD`) instead of full timestamps, matching the Kit API contract. Date strings and timestamp formatting on other endpoints remain unchanged.
- 1beccbb: Expose the optional `total_count` field in shared pagination response types so callers can read record counts requested with `include_total_count: true`.
- 70445a8: Correct `ListPurchases` transaction IDs and product line-item IDs (`lid`) from `number` to `string` to match the Kit API response and the existing create/get purchase types.
- 6c68af2: Send `email_address` as an encoded query parameter in `tags.removeSubscriberByEmail()` instead of a JSON DELETE body, matching the Kit API contract.
- b1127c5: Use the shared pagination type for webhook list responses, exposing the optional `total_count` returned when `include_total_count` is requested.
- cc0816a: Correct subscriber list, get, create, and update response types to allow null first names and null custom field values. Consumers should check these values before using string methods.
- e3b510c: Keep the README concise, move detailed usage guides into the published `docs/` directory, and document contributor setup in root-level `DEVELOPMENT.md`.
- 511189d: Correct the README examples to use the SDK's supported parameters, response shapes, and cursor pagination.
- 8f2c3f2: Respect valid `Retry-After` headers on retryable HTTP responses, using the longer of the requested wait and configured backoff. Support seconds and HTTP dates, retain backoff for invalid headers, and split long waits to avoid Node timer overflow.
- 652800e: Prevent successful requests from being retried when reading or parsing their response fails. Return an empty object for empty successful response bodies.
- 79bb11f: Reject invalid retry options when constructing the client: `maxRetries` must be a non-negative safe integer and `retryDelay` must be a finite non-negative number. Preserve zero values and default options.
- fa396c0: Respect explicit zero values for `maxRetries` and `retryDelay`, allowing retries to be disabled or performed without a delay.

## 0.3.2

### Patch Changes

- 0717f8f: Update dev dependencies

## 0.3.1

### Patch Changes

- 139a3eb: update doc block urls for api references
- fa4f602: update all dev dependencies to latest versions
- 139a3eb: resolve incorrect types for account and broadcasts

## 0.3.0

### Minor Changes

- 4a09457: add `/subscribers/filter` endpoint
- 2a645ac: add `/subscriber/:id/stats` endpoint

## 0.2.5

### Patch Changes

- d77f07a: Ensure build files generated before release

## 0.2.4

### Patch Changes

- 182cf9b: Fix issue with cjs types not resolving correctly

## 0.2.3

### Patch Changes

- cf6e419: Bump dev dependencies to latest version

## 0.2.2

### Patch Changes

- 225269d: Bump dev dependencies to latest version

## 0.2.1

### Patch Changes

- 9db19d0: Resolved various issues related to the main api client:
  - Added test cases to ensure retry logic works as expected.
  - Added test cases to ensure retry configuration is respected.
  - Resolved a bug when a JSON body was unable to be parsed, the body was attempted to be parsed again as text.

## 0.2.0

### Minor Changes

- cd89a2b: add retry logic for 5xx adn 429 requests if they fail

## 0.1.2

### Patch Changes

- 3c9c0fb: Update readme with api documentation and relevant information

## 0.1.1

### Patch Changes

- 57e42dd: Update readme to reflect the publish status

## 0.1.0

### Minor Changes

- 8d4729f: Initial release of the Node.js SDK for the kit.com API.

  This SDK provides a simple way to interact with the kit.com API by handling requests to API endpoints. It also includes type-hinted parameters and responses to improve developer experience and reduce potential errors.

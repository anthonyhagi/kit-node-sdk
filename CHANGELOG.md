# @anthonyhagi/kit-node-sdk

## 0.7.1

### Patch Changes

- 642e6c7: Accept documented nullable post-list pagination parameters and omit null page sizes instead of sending per_page=null. Preserve defined pagination values and explicit false content and total-count flags.
- 619fdea: Accept documented nullable purchase-list pagination parameters. Null cursors and page sizes are omitted from the query while defined values and explicit false total-count flags are preserved.
- 0eab867: Accept documented nullable subscriber list pagination parameters while preserving sorting, filters, includes, and explicit false flags.
- 075ef2c: Accept documented nullable subscriber tag pagination parameters while preserving explicit false total-count flags.

## 0.7.0

### Minor Changes

- b37aa95: Support optional AbortSignal cancellation for listing, creating, and deleting legacy webhooks.
- 6f3a6a0: Support optional AbortSignal cancellation across all account methods, including account details, creator profiles, colors, and statistics.
- b2ed568: Support optional AbortSignal cancellation for listing, fetching, and creating purchases.
- 3f02060: Breaking: raise the minimum supported Node.js version from 18 to 22. Node 18 and 20 users must upgrade their runtime before installing this release. Target Node 22 in the compiled package and verify packed ESM/CommonJS usage on Node 22.0.0, latest Node 22, and Node 24.
- 9fced24: Support optional AbortSignal cancellation across all custom-field methods, including bulk field creation and subscriber-value updates.
- e80311a: Support optional AbortSignal cancellation across all webhook endpoint methods, including signing secret rotation and previous-secret revocation.
- 25fd257: Support optional AbortSignal cancellation for posts, segments, and email templates, completing cancellation support across resource methods.
- b35c389: Support optional AbortSignal cancellation for listing, fetching, creating, and updating snippets.

### Patch Changes

- 1db2ca6: Fix request header overrides to replace default and authentication headers regardless of casing. Lowercase or mixed-case overrides no longer combine values such as Content-Type or Authorization with the original header.
- 179cd2b: Accept documented nullable broadcast list filters for normal and slim responses.
- 22fd29f: Accept documented nullable broadcast stats list filters and omit null query values while preserving status filters and explicit false count flags.
- 3e9b9fb: Allow nullable referrers when adding form subscribers by email and preserve defined referrer values in the request body.
- 5eec5d6: Accept documented nullable form list filters while preserving subscriber-count inclusion and explicit false total-count flags.
- c01e26f: Accept documented nullable form subscriber list filters for normal and slim responses.
- b8d8acb: Accept documented nullable sequence email list parameters and omit null query values while preserving explicit false content flags.
- c5d4f3c: Accept documented nullable sequence subscriber list filters while preserving status filters and explicit false total-count flags.
- 5cff9f4: Accept documented nullable snippet list parameters and omit null query values while preserving explicit false flags.
- 40a86c5: Accept documented nullable tag subscriber list filters while preserving status filters and explicit false flags.
- 4c3a525: Accept documented nullable webhook endpoint pagination parameters and omit null query values while preserving status filters and explicit false count flags.
- bded8c0: Fix low-level request query merging when the path already contains query parameters or a fragment. Additional parameters now append to the existing query before the fragment, preserving repeated keys and correctly encoding values.
- 521269a: Expose ListSlimTagSubscribers and return it for slim tag subscriber listing, allowing omitted custom fields and tagging metadata while retaining full response types for normal requests.
- cdfa226: Make URL filter patterns and matching mode optional, allowing ID-only filters and Kit's default exact matching behavior.

## 0.6.0

### Minor Changes

- 13f0801: Expose optional user IDs, account sending addresses with verification and DMARC flags, and account plan details with nullable dates in `GetCurrentAccount` responses.
- 79d91c2: Support per-request AbortSignal cancellation on direct API methods, including response reads and retry waits. Caller cancellations propagate without retrying; per-attempt timeout retries remain supported.
- 6e41801: Expose the optional allow_starting_point flag for broadcast creation and updates so callers can send custom HTML with Starting point templates.
- 8c85ee1: Export completed callback payload types for all eight bulk methods, without the SDK-only synchronous/asynchronous discriminator, and document handling callbacks.
- 0231b4a: Add `customFields.bulkUpdateSubscriberValues()` for OAuth bulk updates of subscriber custom-field values, with typed synchronous results, per-entry failures, and asynchronous acknowledgements.
- c2dfd35: Add tags.bulkDelete() and public request and response types for deleting tag definitions in bulk, including synchronous per-tag failures and asynchronous callback support.
- f363f4c: Support optional AbortSignal cancellation across all tag methods, including pagination, subscriber tagging and removal, and bulk operations.
- 594a858: Support `include: "subscriber_count"` in `kit.forms.list()` and expose optional active subscriber counts in form list responses.
- 2354057: Support optional AbortSignal cancellation across all sequence methods, including subscriber enrollment, pagination, and sequence management.
- 131f25a: Add `generateOAuthPKCE()` to generate a cryptographically random verifier and its S256 challenge for Kit's PKCE authorization flow.
- 03b1292: Add `buildOAuthAuthorizationUrl()` for standard and PKCE authorization redirects, including encoded state, scope, and tenant parameters.
- 521f21d: Allow OAuth code exchange, token refresh, and revocation requests to be cancelled with an optional AbortSignal, without automatic retries.
- 796e702: Add `exchangeOAuthCode()` to exchange an authorization code and client credentials for typed access and refresh tokens using a single request.
- 8335bd7: Support PKCE authorization code exchanges by accepting a `code_verifier` in place of a `client_secret` in `exchangeOAuthCode()`.
- b925e03: Add `refreshOAuthToken()` and a typed `OAuthTokenResponse` for obtaining replacement access and refresh tokens. The helper makes one request because Kit refresh tokens are single-use.
- 33cc110: Add the exported `revokeOAuthToken()` helper to invalidate Kit-issued access or refresh tokens when a creator disconnects an OAuth app.
- 707a39a: Support optional AbortSignal cancellation across all broadcast methods while preserving slim list response inference.
- 6c2e322: Support optional AbortSignal cancellation across all form methods while preserving slim subscriber response inference.
- 55684ec: Support `slim` in `forms.listSubscribers()` with exported slim response types, optional expensive fields, and full response inference when slim is false or omitted.
- cc24bba: Support the `slim` option on `subscribers.list()` and make list response custom fields optional because slim responses omit them. Preserve explicit false values in the query string.
- a41c0bd: Support optional AbortSignal cancellation across all sequence-email methods, including content management, pagination, and stats reads.
- 164e07a: Add optional RequestOptions to subscribers.list() so callers can cancel filtered and paginated requests with an AbortSignal.
- dece27e: Support comma-separated `include` fields on `subscribers.list()` and type optional attribution, tags, location, and cancellation details in list responses. Document that requesting `canceled_at` requires `status: "cancelled"`.
- 8593b8c: Support `include: "subscriber_count"` in `kit.tags.list()` and expose optional active subscriber counts in tag list responses.
- 10e1ea7: Add the slim option to tags.listSubscribers() for requesting smaller responses, preserving explicit false values alongside pagination and filters.
- df3e8d0: Support optional AbortSignal cancellation across all subscriber methods, including mutations, location operations, stats, tags, and engagement filtering.
- f027aff: Export webhook delivery envelopes and discriminated event payload types for the currently available webhook endpoint events.
- 4200b64: Add a raw-body webhook signature verifier with timestamp tolerance, constant-time HMAC comparison, and support for secret rotation.

### Patch Changes

- 3b137e9: Expose the nullable public_url field returned by broadcast creation, matching Kit's API response and the get/update response types.
- b5fe813: Expose optional subject and nullable send_at metadata in broadcast stats list responses.
- 64a3f7a: Allow callers to omit content when creating a broadcast with a Starting point template to use the template's own design.
- 8200489: Align bulk subscriber request fields with Kit's schema: first_name, email_address, and state are optional and nullable. Missing or invalid email addresses remain subject to the API's per-subscriber failures.
- 2d6ec53: Correct subscriber stats date-filter comments and document Kit's email stats retention window and HTTP 400 error handling starting October 15, 2026.
- 537dcb4: Document eventual consistency, using returned subscriber IDs after writes, and the distinction between stale successful reads and SDK retries.
- b978d19: Format Date inputs for form subscriber added and created filters as UTC YYYY-MM-DD dates, preserving string inputs.
- 2112e04: Preserve explicit `include_total_count: false` across the remaining paginated list and subscriber filter methods, while continuing to omit undefined values.
- 02809fd: Allow nullable form and subscriber IDs in bulk form subscription requests, and nullable form IDs in synchronous failure responses, matching the Kit API schema.
- 82b44ea: Allow nullable tag and subscriber IDs in `tags.bulkTag()` requests, matching the Kit API schema.
- b811185: Allow a null position in sequence email creation responses to match Kit's API schema. Callers should check for null before using the returned position as a number.
- be1eb0b: Allow null custom-field values in `forms.listSubscribers()` responses, matching the Kit API schema and examples.
- d663724: Allow null first names in form subscription responses from `addSubscriber()` and `addSubscriberByEmail()`, matching the Kit API schema.
- 7df78ce: Allow null subscriber state in `forms.addSubscriber()` responses, matching the Kit API's newly added subscription response schema.
- edacb6c: Allow null custom-field values in `sequences.listSubscribers()` responses, matching the Kit API schema and examples.
- c8bbd10: Make purchase response sources optional for list, get, and create responses to match Kit's API schema. Callers should check whether `source` is present before using it.
- d06e464: Mark the package as free of import-time side effects so bundlers can remove unused imports.
- 6c86b31: Correct account palette documentation and the empty-palette error to use the supported 10-color limit, and clarify that updating colors replaces the entire palette.
- f09539d: Export the remaining subscriber engagement, signup-date, broadcast, and URL filter condition types from the package entry point.
- 2f7c95f: Format Date inputs for sequence subscriber added/created date filters as YYYY-MM-DD using their UTC calendar date, preserving string inputs.
- 1164499: Allow null custom-field values in sequence subscriber list responses, matching Kit's documented response.
- 258d8d8: Allow null first names in sequence enrollment responses by subscriber ID and email address, matching Kit's response schemas.
- e564ca4: Format Date inputs for subscriber list created/updated date filters as YYYY-MM-DD using their UTC calendar date, preserving string inputs.
- 0585f51: Expose optional `location` and `canceled_at` fields on `GetSubscriber`. Type cancellation timestamps and undetermined location fields as nullable, matching Kit's response schema.
- d8f0871: Expose optional custom-field `warnings` arrays on subscriber create and update responses so callers can identify unknown field keys ignored by Kit.
- 31941cf: Complete subscriber list sort field suggestions with created_at, canceled_at, and the documented engagement metrics. Document cancellation status and engagement email filter restrictions while preserving custom sort strings.
- fcad677: Format Date inputs for tagged subscriber created/tagged date filters as YYYY-MM-DD using their UTC calendar date, preserving string inputs.
- 8ee67bb: Allow null first names in subscriber tagging responses by ID and email address, matching Kit's response schema.
- 793632f: Preserve explicit `include_total_count: false` in legacy webhook list requests while continuing to omit undefined values.
- 0206315: Correct `event.initiator_value` in legacy webhook list responses to an optional nullable string, matching link-click URL configuration.

## 0.5.0

### Minor Changes

- 91be42b: Add `kit.snippets.create(params)` with discriminated inline/block request types and an exported creation response type supporting nullable document HTML.
- 9bc435e: Add `kit.webhookEndpoints.create(params)` with exported request and response types, including the signing secret returned at creation.
- 8b34654: Add custom-field events and `custom_field_id` to legacy webhook creation types, including the numeric field ID for value-update subscriptions.
- 2f42e53: Add `subscribers.deleteLocation()` to remove a pinned subscriber location. Return an empty object on successful deletion or null when the subscriber is not found.
- 30341d4: Add `kit.webhookEndpoints.delete(id)` to delete a webhook endpoint. Empty 204 responses return an empty object; missing or inaccessible endpoints return null.
- a7714a5: Add `kit.posts.get(id)` and the exported `GetPost` response type with required HTML content and publishing metadata. Missing posts return null.
- f683d8a: Add `kit.snippets.get(id)` and the exported `GetSnippet` response type, with required content and document fields. Missing snippets return null.
- 7824e74: Add `kit.webhookEndpoints.get(id)` and the exported `GetWebhookEndpoint` response type. Missing or inaccessible endpoints return null, and metadata excludes signing secrets.
- 2aa55a6: Add `kit.posts.list()` with cursor pagination, optional HTML content and total counts, and exported response types for publishing metadata and nullable draft fields.
- af50ed8: Add `kit.snippets.list()` with pagination, snippet type and archive filters, optional content/document inclusion, and exported request and response types.
- b725d02: Add `kit.webhookEndpoints.list()` with cursor pagination, total counts, active/disabled filtering, and exported endpoint metadata types.
- 0c3345d: Add `subscribers.pinLocation()` and export `PinSubscriberLocationParams` and `PinSubscriberLocation` for pinning an explicit subscriber location.
- 0b89680: Add `kit.webhookEndpoints.revokePreviousSecret(id)` to close a signing-secret rotation overlap window early, with exported response types. Missing endpoints return null.
- 7af3812: Add `kit.webhookEndpoints.rotateSecret(id, params)` with optional force handling and exported types for the new signing secret and previous-secret expiry. Missing endpoints return null.
- 2313ad2: Add original signup attribution filters for form/landing-page IDs and Kit source fields. Export `FilterSubscriberBodyAllAttribution`, `FilterSubscriberBodyAnyForms`, and `FilterSubscriberBodyAnyKitSource` for typed subscriber filtering.
- 95e48cf: Add the optional `counting_mode` subscriber filter setting, supporting raw engagement-event counts and distinct-email counts.
- 8465724: Add custom-field conditions to subscriber filters with exact, substring, presence, and numeric comparisons. Export `FilterSubscriberBodyAllCustomField` for reusable conditions.
- 517d086: Support subscriber filter includes for attribution, tags, location, canceled_at, stats, and custom fields. Export `FilterSubscriberInclude`, support optional stats date ranges, and type the optional embedded response fields, including nullable values.
- 2ad8d1f: Add optional `sort_field` and `sort_order` settings to subscriber filter requests.
- 11bed60: Add inclusive engagement count thresholds (`count_greater_than_or_equal` and `count_less_than_or_equal`) to subscriber filters. Correct the existing greater-than and less-than descriptions to identify their exclusive bounds.
- 36bcb18: Add location conditions to subscriber filtering and export `FilterSubscriberBodyAllLocation`, enabling typed geographic filtering and distance sorting.
- a15c1fd: Add subscriber lifecycle state conditions to subscriber filtering and export `FilterSubscriberBodyAllState`, enabling typed filtering by one or more states alone or alongside other conditions.
- 22b33a7: Add typed tag-ID conditions to subscriber filtering and export `FilterSubscriberBodyAllTags` for reusable tag filters.
- c9acf14: Add `kit.snippets.update(id, params)` with exported request and response types for partial inline/block content, name, and archive updates. Missing snippets return null.
- 50c1e66: Add `subscribers.updateLocation()` for replacing an existing pinned location via PATCH. Export `UpdateSubscriberLocationParams` and `UpdateSubscriberLocation`, keeping all six location fields required.
- b22ef22: Add `kit.webhookEndpoints.update(id, params)` with partial metadata, status, and event subscription updates, exported types, and shared API-client PATCH support. Missing endpoints return null.

### Patch Changes

- 31e3c4c: Correct the filtered subscriber response type to allow null first names. Consumers should check for null before using string methods.
- acfaa51: Allow null values for `event.tag_id` and `event.form_id` in legacy webhook list responses, matching the Kit API schema.
- 05bcea1: Read HTTP error response bodies once without cloning them, preserving existing JSON and raw text error details while avoiding an unread buffered stream.
- f5a319f: Use timer-safe waits for network and HTTP retries, cap calculated backoff at the maximum safe integer, and preserve disabled backoff at high retry counts.
- 19f4f64: Allow URL-pattern subscriber filters without URL IDs, matching the Kit API's documented request format.

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

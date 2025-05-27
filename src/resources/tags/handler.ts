import type { Kit } from "~/index";
import { toDateString } from "~/utils/date";
import type {
  BulkCreateTags,
  BulkCreateTagsParams,
  BulkCreateTagsWithoutType,
  BulkRemoveTags,
  BulkRemoveTagsParams,
  BulkRemoveTagsWithoutType,
  BulkTag,
  BulkTagParams,
  BulkTagWithoutType,
  CreateTag,
  CreateTagParams,
  ListTags,
  ListTagsParams,
  ListTagSubscribers,
  ListTagSubscribersParams,
  RemoveSubscriberByEmailParams,
  TagSubscriber,
  TagSubscriberByEmail,
  TagSubscriberByEmailParams,
  UpdateTag,
  UpdateTagParams,
} from "./types";

/**
 * A handler for interacting with the Tags API endpoints.
 *
 * This class provides methods to manage tags, including creating, listing,
 * updating, and associating them with subscribers.
 *
 * It is accessed via the `kit.tags` property of the main `Kit` instance.
 *
 * @example Accessing the Tags Handler
 * ```typescript
 * import { Kit } from '@anthonyhagi/kit-node-sdk';
 *
 * const kit = new Kit({ apiKey: 'your_api_key' });
 *
 * // Access tag methods
 * kit.tags.list();
 * ```
 *
 * @remarks
 * Common errors that may be thrown include:
 * - Authentication errors (invalid or missing API key).
 * - Request payload too large (specifically for bulk operations with many items).
 * - Invalid data sent in the request body.
 */
export class TagsHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Create multiple Tags at once in a bulk operation.
   *
   * This method can operate synchronously for smaller numbers of tags
   * or asynchronously for larger requests.
   *
   * NOTE: This endpoint must be used with an OAuth api key.
   *
   * @param params An object containing:
   *   - `tags` — An array of objects, each with a `name` property for the tag to create.
   *   - `callback_url` — An optional URL to receive a webhook notification when
   *     an asynchronous operation is complete (recommended for > 100 tags).
   *
   * @returns A `BulkCreateTags` object. If the operation is synchronous, it will
   *   have `type: "synchronous"` and include `tags` (created tags) and `failures`
   *   arrays. If asynchronous, it will have `type: "asynchronous"`.
   *
   * @example Creating tags synchronously
   * ```typescript
   * const result = await kit.tags.bulkCreate({
   *   tags: [{ name: 'New Tag 1' }, { name: 'New Tag 2' }]
   * });
   * ```
   */
  public async bulkCreate(
    params: BulkCreateTagsParams
  ): Promise<BulkCreateTags> {
    const body = JSON.stringify(params);
    const url = "/bulk/tags/subscribers";

    const resp = await this.api.post<BulkCreateTagsWithoutType>(url, { body });

    // Add on the response type such that the caller of this method
    // understands the result. This ensures that type hinting
    // works as expected for a synchronous result, and that
    // asynchronous results don't show anything.
    if ("tags" in resp) {
      return { type: "synchronous", ...resp };
    }

    return { type: "asynchronous", ...resp };
  }

  /**
   * Remove multiple Tags from Subscribers in a bulk operation.
   *
   * This method can operate synchronously for smaller numbers of taggings
   * or asynchronously for larger requests.
   *
   * NOTE: This endpoint must be used with an OAuth api key.
   *
   * @param params An object containing:
   *   - `taggings` — An array of objects, each with `tag_id` and `subscriber_id`
   *     properties indicating the tag-subscriber association to remove.
   *   - `callback_url` — An optional URL to receive a webhook notification when
   *     an asynchronous operation is complete.
   *
   * @returns A `BulkRemoveTags` object. If the operation is synchronous, it will
   *   have `type: "synchronous"` and include a `failures` array. If asynchronous,
   *   it will have `type: "asynchronous"`.
   *
   * @example Removing tags in bulk
   * ```typescript
   * const result = await kit.tags.bulkRemove({
   *   taggings: [{ tag_id: 123, subscriber_id: 456 }, { tag_id: 124, subscriber_id: 457 }]
   * });
   * ```
   */
  public async bulkRemove(
    params: BulkRemoveTagsParams
  ): Promise<BulkRemoveTags> {
    const body = JSON.stringify(params);
    const url = "/bulk/tags/subscribers";

    const resp = await this.api.delete<BulkRemoveTagsWithoutType>(url, {
      body,
    });

    // Add on the response type such that the caller of this method
    // understands the result. This ensures that type hinting
    // works as expected for a synchronous result, and that
    // asynchronous results don't show anything.
    if ("failures" in resp) {
      return { type: "synchronous", ...resp };
    }

    return { type: "asynchronous", ...resp };
  }

  /**
   * Add multiple Tags to Subscribers in a bulk operation.
   *
   * This method can operate synchronously for smaller numbers of taggings
   * or asynchronously for larger requests.
   *
   * NOTE: This endpoint must be used with an OAuth api key.
   *
   * @param params - An object containing:
   *   - `taggings` — An array of objects, each with `tag_id` and `subscriber_id`
   *     properties indicating the tag and subscriber to associate.
   *   - `callback_url` — An optional URL to receive a webhook notification when
   *     an asynchronous operation is complete (recommended for > 100 taggings).
   *
   * @returns A `BulkTag` object. If the operation is synchronous, it will
   *   have `type: "synchronous"` and include a `subscribers` array with details
   *   of the affected subscribers and a `failures` array. If asynchronous,
   *   it will have `type: "asynchronous"`.
   *
   * @example Tagging subscribers in bulk
   * ```typescript
   * const result = await kit.tags.bulkTag({
   *   taggings: [{ tag_id: 123, subscriber_id: 456 }, { tag_id: 124, subscriber_id: 457 }]
   * });
   * ```
   */
  public async bulkTag(params: BulkTagParams): Promise<BulkTag> {
    const body = JSON.stringify(params);
    const url = "/bulk/tags/subscribers";

    const resp = await this.api.post<BulkTagWithoutType>(url, { body });

    // Add on the response type such that the caller of this method
    // understands the result. This ensures that type hinting
    // works as expected for a synchronous result, and that
    // asynchronous results don't show anything.
    if ("subscribers" in resp) {
      return { type: "synchronous", ...resp };
    }

    return { type: "asynchronous", ...resp };
  }

  /**
   * Retrieves a paginated list of all Tags.
   *
   * @param params Optional parameters for controlling pagination and
   * results count.
   *   - `after` — A cursor string from a previous response's
   *     `pagination.end_cursor` to fetch the next page.
   *   - `before` — A cursor string from a previous response's
   *     `pagination.start_cursor` to fetch the previous page.
   *   - `include_total_count` — Set to `true` to include the total count
   *      of records. May slightly slow down response for large
   *      collections.
   *   - `per_page` — Number of records per page. Defaults to 500,
   *      maximum 1000.
   *
   * @returns A `ListTags` object containing an array of `Tag` objects
   * and pagination details.
   *
   * @example Listing tags
   * ```typescript
   * const tagsList = await kit.tags.list({ per_page: 10 });
   * ```
   *
   * @example Listing the next page
   * ```typescript
   * if (tagsList.pagination.has_next_page) {
   *   const nextTagsList = await kit.tags.list({
   *     after: tagsList.pagination.end_cursor
   *   });
   * }
   * ```
   */
  public async list(params?: ListTagsParams): Promise<ListTags> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListTags>("/tags", { query });
  }

  /**
   * Creates a new Tag.
   *
   * @param params An object containing:
   *   - `name` — The name for the new tag.
   *
   * @returns A `CreateTag` object containing the details of the newly
   * created `Tag`.
   *
   * @example Creating a new tag
   * ```typescript
   * await kit.tags.create({ name: 'Beginners' });
   * ```
   */
  public async create(params: CreateTagParams): Promise<CreateTag> {
    const body = JSON.stringify(params);

    return await this.api.post<CreateTag>("/tags", { body });
  }

  /**
   * Update a Tag.
   *
   * @param tagId The unique ID of the tag to update.
   * @param params The parameters for the update, including the new name.
   *
   * @returns The updated Tag object on success, or `null` if the Tag
   * was not found.
   */
  public async update(
    tagId: number,
    params: UpdateTagParams
  ): Promise<UpdateTag | null> {
    const body = JSON.stringify(params);

    return await this.api.put<UpdateTag | null>(`/tags/${tagId}`, { body });
  }

  /**
   * Removes a Subscriber from a Tag using the Subscriber's email address.
   *
   * @param tagId The unique ID of the Tag.
   * @param params - An object containing:
   *   - `email_address` — The email address of the subscriber to remove
   *     from the tag.
   *
   * @returns An empty object `{}` on success. Returns `null` if the
   * Tag or Subscriber was not found, or if the subscriber was not
   * tagged with the specified tag.
   *
   * @example Removing a subscriber by email
   * ```typescript
   * const result = await kit.tags.removeSubscriberByEmail(123, {
   *   email_address: 'subscriber@email.com'
   * });
   * ```
   */
  public async removeSubscriberByEmail(
    tagId: number,
    params: RemoveSubscriberByEmailParams
  ): Promise<{} | null> {
    const body = JSON.stringify(params);
    const url = `/tags/${tagId}/subscribers`;

    return await this.api.delete<{} | null>(url, { body });
  }

  /**
   * Retrieves a paginated list of Subscribers associated with a
   * specific Tag.
   *
   * @param tagId The unique ID of the tag.
   * @param params Optional parameters for pagination and filtering:
   *   - `after` — A cursor string from a previous response's
   *     `pagination.end_cursor`.
   *   - `before` — A cursor string from a previous response's
   *     `pagination.start_cursor`.
   *   - `created_after` — Filter subscribers created after this date
   *     (yyyy-mm-dd). Can be a Date object or string.
   *   - `created_before` — Filter subscribers created before this date
   *     (yyyy-mm-dd). Can be a Date object or string.
   *   - `include_total_count` — Set to `true` to include the total count.
   *   - `per_page` — Number of records per page.
   *   - `status` — Filter by subscriber status (e.g., 'active',
   *     'bounced'). Defaults to 'active'.
   *   - `tagged_after` — Filter subscribers tagged after this date
   *     (yyyy-mm-dd). Can be a Date object or string.
   *   - `tagged_before` — Filter subscribers tagged before this date
   *     (yyyy-mm-dd). Can be a Date object or string.
   *
   * @returns A `ListTagSubscribers` object containing an array of
   * subscriber details and pagination details, or `null` if the
   * Tag was not found.
   *
   * @example Listing subscribers for a tag
   * ```typescript
   * const tagSubscribers = await kit.tags.listSubscribers(123, {
   *   per_page: 50,
   *   status: 'active'
   * });
   * ```
   */
  public async listSubscribers(
    tagId: number,
    params?: ListTagSubscribersParams
  ): Promise<ListTagSubscribers | null> {
    const {
      after,
      before,
      created_after,
      created_before,
      include_total_count,
      per_page,
      status,
      tagged_after,
      tagged_before,
    } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(created_after && { created_after: toDateString(created_after) }),
      ...(created_before && { created_before: toDateString(created_before) }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
      ...(status && { status }),
      ...(tagged_after && { tagged_after: toDateString(tagged_after) }),
      ...(tagged_before && { tagged_before: toDateString(tagged_before) }),
    });

    const url = `/tags/${tagId}/subscribers`;

    return await this.api.get<ListTagSubscribers | null>(url, { query });
  }

  /**
   * Associates a Subscriber with a Tag using the Subscriber's email address.
   *
   * If the subscriber does not exist, this API call will fail.
   *
   * @param tagId The unique ID of the tag.
   * @param params - An object containing:
   *   - `email_address`: The email address of the subscriber to tag.
   *
   * @returns A `TagSubscriberByEmail` object containing the details of
   * the `subscriber` who was tagged. Returns `null` if the Tag was not
   * found.
   *
   * @example Tagging a subscriber by email
   * ```typescript
   * const taggedSubscriber = await kit.tags.tagSubscriberByEmail(123, {
   *   email_address: 'existing.email@example.com'
   * });
   * ```
   */
  public async tagSubscriberByEmail(
    tagId: number,
    params: TagSubscriberByEmailParams
  ): Promise<TagSubscriberByEmail | null> {
    const body = JSON.stringify(params);
    const url = `/tags/${tagId}/subscribers`;

    return await this.api.post<TagSubscriberByEmail | null>(url, { body });
  }

  /**
   * Removes a Subscriber from a Tag using the Subscriber's unique ID.
   *
   * @param tagId The unique ID of the tag.
   * @param subscriberId The unique ID of the subscriber to remove from the tag.
   *
   * @returns An empty object `{}` on success. Returns `null` if the Tag or Subscriber
   *   was not found, or if the subscriber was not tagged with the specified tag.
   *
   * @example Removing a subscriber by ID
   * ```/dev/null/example.ts
   * const result = await kit.tags.removeSubscriber(123, 456);
   *
   * if (result !== null) {
   *   console.log('Subscriber successfully removed from tag.');
   * } else {
   *   console.log('Tag or Subscriber not found, or subscriber was not tagged.');
   * }
   * ```
   */
  public async removeSubscriber(
    tagId: number,
    subscriberId: number
  ): Promise<{} | null> {
    const url = `/tags/${tagId}/subscribers/${subscriberId}`;

    return await this.api.delete<{} | null>(url);
  }

  /**
   * Associates a Subscriber with a Tag using the Subscriber's unique ID.
   * The subscriber must already exist.
   *
   * @param tagId The unique ID of the Tag.
   * @param subscriberId The unique ID of the Subscriber to tag.
   *
   * @returns A `TagSubscriber` object containing the details of the `subscriber`
   *   who was tagged. Returns `null` if the Tag or Subscriber was not found.
   *
   * @example Tagging a subscriber by ID
   * ```typescript
   * const taggedSubscriber = await kit.tags.tagSubscriber(123, 456);
   *
   * if (taggedSubscriber) {
   *   console.log('Subscriber tagged:', taggedSubscriber.subscriber);
   * } else {
   *   console.log('Tag or Subscriber not found.');
   * }
   * ```
   */
  public async tagSubscriber(
    tagId: number,
    subscriberId: number
  ): Promise<TagSubscriber | null> {
    const url = `/tags/${tagId}/subscribers/${subscriberId}`;

    return await this.api.post<TagSubscriber | null>(url);
  }
}

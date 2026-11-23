import type { Kit, RequestOptions } from "~/index";
import { toDateOnlyString } from "~/utils/date";
import { paginationQuery } from "~/utils/pagination";
import type {
  BulkCreateSubscribers,
  BulkCreateSubscribersParams,
  BulkCreateSubscribersWithoutType,
  CreateSubscriber,
  CreateSubscriberParams,
  FilterSubscriberBody,
  FilterSubscriberParams,
  FilterSubscribers,
  GetSubscriber,
  GetSubscriberStats,
  GetSubscriberStatsParams,
  GetSubscriberTags,
  GetSubscriberTagsParams,
  ListFullSubscribers,
  ListSlimSubscribers,
  ListSubscribers,
  ListSubscribersParams,
  PinSubscriberLocation,
  PinSubscriberLocationParams,
  UpdateSubscriber,
  UpdateSubscriberLocation,
  UpdateSubscriberLocationParams,
  UpdateSubscriberParams,
} from "./types";

export class SubscribersHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Create Subscribers in bulk.
   *
   * @remarks This endpoint requires you to specify at least one
   * new Subscriber to create them. When > 100 subscribers are
   * provided, the endpoint runs asynchronously. When running
   * it asynchronously, provide a `callback_url` to handle
   * the result of the request.
   *
   * @param params - The required and optional parameters.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/bulk-create-subscribers}
   *
   * @returns A response from the server when it is run synchronously;
   * an empty object when it is run asynchronously.
   */
  public async bulkCreate(
    params: BulkCreateSubscribersParams,
    options?: RequestOptions
  ): Promise<BulkCreateSubscribers> {
    const body = JSON.stringify(params || {});
    const url = "/bulk/subscribers";

    const resp = await this.api.post<BulkCreateSubscribersWithoutType>(url, {
      body,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });

    if ("subscribers" in resp) {
      return { type: "synchronous", ...resp };
    }

    return { type: "asynchronous", ...resp };
  }

  /**
   * Get a paginated list of all Subscribers.
   *
   * @param params - Optional filters.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/list-subscribers}
   *
   * @returns the paginated list of subcribers based on any provided
   * filters.
   */
  public async list(
    params: ListSubscribersParams & { slim: true },
    options?: RequestOptions
  ): Promise<ListSlimSubscribers>;
  public async list(
    params?: ListSubscribersParams & { slim?: false | undefined },
    options?: RequestOptions
  ): Promise<ListFullSubscribers>;
  public async list(
    params?: ListSubscribersParams,
    options?: RequestOptions
  ): Promise<ListFullSubscribers | ListSlimSubscribers>;
  public async list(
    params?: ListSubscribersParams,
    options?: RequestOptions
  ): Promise<ListFullSubscribers | ListSlimSubscribers> {
    const {
      created_after,
      created_before,
      email_address,
      include,
      slim,
      sort_field,
      sort_order,
      status,
      updated_after,
      updated_before,
    } = params || {};

    const query = new URLSearchParams({
      ...paginationQuery(params),
      ...(created_after && { created_after: toDateOnlyString(created_after) }),
      ...(created_before && {
        created_before: toDateOnlyString(created_before),
      }),
      ...(email_address && { email_address }),
      ...(include && { include }),
      ...(slim !== undefined && { slim: String(slim) }),
      ...(sort_field && { sort_field }),
      ...(sort_order && { sort_order }),
      ...(status && { status }),
      ...(updated_after && { updated_after: toDateOnlyString(updated_after) }),
      ...(updated_before && {
        updated_before: toDateOnlyString(updated_before),
      }),
    });

    const url = "/subscribers";

    return await this.api.get<ListSubscribers>(url, {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Create a subscriber or update the first name of one with the same email.
   *
   * The state parameter applies only when creating a subscriber. This endpoint
   * cannot change an existing subscriber's state.
   *
   * @param params - The subscriber email and details to create or update.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/create-a-subscriber}
   *
   * @returns The created or existing subscriber details.
   */
  public async create(
    params: CreateSubscriberParams,
    options?: RequestOptions
  ): Promise<CreateSubscriber> {
    const body = JSON.stringify(params || {});

    const url = "/subscribers";

    return await this.api.post<CreateSubscriber>(url, {
      body,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Filter subscribers based on engagement.
   *
   * @param body - The parameters to filter the subscribers.
   * @param params - The query parameters to filter the results.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/filter-subscribers-by-engagement-sign-up-date-state-and-tags}
   *
   * @returns a paginated list of Subscribers.
   */
  public async filter(
    body: FilterSubscriberBody,
    params?: FilterSubscriberParams,
    options?: RequestOptions
  ): Promise<FilterSubscribers> {
    const query = new URLSearchParams(paginationQuery(params));

    return await this.api.post<FilterSubscribers>("/subscribers/filter", {
      body: JSON.stringify(body || {}),
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Get a Subscriber by their unique ID.
   *
   * @param id - The Subscribers' unique ID to search by.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/get-a-subscriber}
   *
   * @returns The Subscriber.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   */
  public async get(
    id: number,
    options?: RequestOptions
  ): Promise<GetSubscriber> {
    const url = `/subscribers/${id}`;

    return await this.api.get<GetSubscriber>(url, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Update a Subscribers' details.
   *
   * @param id - The unique ID of the Subscriber.
   * @param params - The new parameters to update on the Subscriber.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/update-a-subscriber}
   *
   * @returns The Subscriber with the updated details.
   */
  public async update(
    id: number,
    params: UpdateSubscriberParams,
    options?: RequestOptions
  ): Promise<UpdateSubscriber> {
    const body = JSON.stringify(params || {});

    const url = `/subscribers/${id}`;

    return await this.api.put<UpdateSubscriber>(url, {
      body,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Unsubscribe the specified Subscriber.
   *
   * @param id - The unique ID of the Subscriber.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/unsubscribe-subscriber}
   *
   * @returns An empty object if the request was successful.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   */
  public async unsubscribe(id: number, options?: RequestOptions): Promise<{}> {
    const url = `/subscribers/${id}/unsubscribe`;

    return await this.api.post<{}>(url, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Pin an explicit location, overriding the Subscriber's inferred location.
   * Replaces an existing pinned location.
   *
   * @param id - The unique ID of the Subscriber.
   * @param params - The location to pin.
   * @param options - Optional request controls, including cancellation.
   * @see {@link https://developers.kit.com/api-reference/subscribers/pin-a-subscribers-location}
   * @returns The pinned location.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   */
  public async pinLocation(
    id: number,
    params: PinSubscriberLocationParams,
    options?: RequestOptions
  ): Promise<PinSubscriberLocation> {
    return await this.api.post<PinSubscriberLocation>(
      `/subscribers/${id}/location`,
      {
        body: JSON.stringify(params),
        signal: options?.signal,
        maxRetries: options?.maxRetries,
      }
    );
  }

  /**
   * Replace the Subscriber's pinned location. All six location fields are
   * required; resend the current value for any field that is not changing.
   *
   * @param id - The unique ID of the Subscriber.
   * @param params - The complete replacement location.
   * @param options - Optional request controls, including cancellation.
   * @see {@link https://developers.kit.com/api-reference/subscribers/update-a-subscribers-pinned-location}
   * @returns The updated location.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   */
  public async updateLocation(
    id: number,
    params: UpdateSubscriberLocationParams,
    options?: RequestOptions
  ): Promise<UpdateSubscriberLocation> {
    return await this.api.patch<UpdateSubscriberLocation>(
      `/subscribers/${id}/location`,
      {
        body: JSON.stringify(params),
        signal: options?.signal,
        maxRetries: options?.maxRetries,
      }
    );
  }

  /**
   * Remove the Subscriber's pinned location. Kit may infer a new location
   * from future open events.
   *
   * @param id - The unique ID of the Subscriber.
   * @param options - Optional request controls, including cancellation.
   * @see {@link https://developers.kit.com/api-reference/subscribers/delete-a-subscribers-location}
   * @returns An empty object on success.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   */
  public async deleteLocation(
    id: number,
    options?: RequestOptions
  ): Promise<{}> {
    return await this.api.delete<{}>(`/subscribers/${id}/location`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Retrieve email stats for a specific Subscriber.
   *
   * @param id - The unique ID of the Subscriber.
   * @param params - Optional parameters to filter by.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/list-stats-for-a-subscriber}
   *
   * @returns The Subscriber's email stats.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   */
  public async getStats(
    id: number,
    params?: GetSubscriberStatsParams,
    options?: RequestOptions
  ): Promise<GetSubscriberStats> {
    const { email_sent_after, email_sent_before } = params || {};

    const query = new URLSearchParams({
      ...(email_sent_after && { email_sent_after }),
      ...(email_sent_before && { email_sent_before }),
    });

    const url = `/subscribers/${id}/stats`;

    return await this.api.get<GetSubscriberStats>(url, {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Get the associated Tags for a Subscriber.
   *
   * @param id - The unique ID of the Subscriber.
   * @param params - Optional parameters to filter by.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/subscribers/list-tags-for-a-subscriber}
   *
   * @returns The Subscribers' Tags.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   */
  public async getTags(
    id: number,
    params?: GetSubscriberTagsParams,
    options?: RequestOptions
  ): Promise<GetSubscriberTags> {
    const query = new URLSearchParams(paginationQuery(params));

    const url = `/subscribers/${id}/tags`;

    return await this.api.get<GetSubscriberTags>(url, {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

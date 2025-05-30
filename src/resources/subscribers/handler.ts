import type { Kit } from "~/index";
import { toDateString } from "~/utils/date";
import type {
  BulkCreateSubscribers,
  BulkCreateSubscribersParams,
  BulkCreateSubscribersWithoutType,
  CreateSubscriber,
  CreateSubscriberParams,
  GetSubscriber,
  GetSubscriberTags,
  GetSubscriberTagsParams,
  ListSubscribers,
  ListSubscribersParams,
  UpdateSubscriber,
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
   *
   * @see {@link https://developers.kit.com/v4#bulk-create-subscribers}
   *
   * @returns A response from the server when it is run synchronously;
   * an empty object when it is run asynchronously.
   */
  public async bulkCreate(
    params: BulkCreateSubscribersParams
  ): Promise<BulkCreateSubscribers> {
    const body = JSON.stringify(params || {});
    const url = "/bulk/subscribers";

    const resp = await this.api.post<BulkCreateSubscribersWithoutType>(url, {
      body,
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
   *
   * @see {@link https://developers.kit.com/v4#list-subscribers}
   *
   * @returns the paginated list of subcribers based on any provided
   * filters.
   */
  public async list(params?: ListSubscribersParams): Promise<ListSubscribers> {
    const {
      after,
      before,
      created_after,
      created_before,
      email_address,
      include_total_count,
      per_page,
      sort_field,
      sort_order,
      status,
      updated_after,
      updated_before,
    } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(created_after && { created_after: toDateString(created_after) }),
      ...(created_before && { created_before: toDateString(created_before) }),
      ...(email_address && { email_address }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
      ...(sort_field && { sort_field }),
      ...(sort_order && { sort_order }),
      ...(status && { status }),
      ...(updated_after && { updated_after: toDateString(updated_after) }),
      ...(updated_before && { updated_before: toDateString(updated_before) }),
    });

    const url = "/subscribers";

    return await this.api.get<ListSubscribers>(url, { query });
  }

  /**
   * Create a new Subscriber.
   *
   * @param params - The parameters to create a new Subscriber.
   *
   * @see {@link https://developers.kit.com/v4#create-a-subscriber}
   *
   * @returns The newly created Subscribers' details.
   */
  public async create(
    params: CreateSubscriberParams
  ): Promise<CreateSubscriber> {
    const body = JSON.stringify(params || {});

    const url = "/subscribers";

    return await this.api.post<CreateSubscriber>(url, { body });
  }

  /**
   * Get a Subscriber by their unique ID.
   *
   * @param id - The Subscribers' unique ID to search by.
   *
   * @see {@link https://developers.kit.com/v4#get-a-subscriber}
   *
   * @returns The Subscriber if found; `null` otherwise.
   */
  public async get(id: number): Promise<GetSubscriber | null> {
    const url = `/subscribers/${id}`;

    return await this.api.get<GetSubscriber | null>(url);
  }

  /**
   * Update a Subscribers' details.
   *
   * @param id - The unique ID of the Subscriber.
   * @param params - The new parameters to update on the Subscriber.
   *
   * @see {@link https://developers.kit.com/v4#update-a-subscriber}
   *
   * @returns The Subscriber with the updated details.
   */
  public async update(
    id: number,
    params: UpdateSubscriberParams
  ): Promise<UpdateSubscriber | null> {
    const body = JSON.stringify(params || {});

    const url = `/subscribers/${id}`;

    return await this.api.put<UpdateSubscriber | null>(url, { body });
  }

  /**
   * Unsubscribe the specified Subscriber.
   *
   * @param id - The unique ID of the Subscriber.
   *
   * @see {@link https://developers.kit.com/v4#unsubscribe-subscriber}
   *
   * @returns An empty object if the request was successful; `null`
   * if the Subscriber was not found.
   */
  public async unsubscribe(id: number): Promise<{} | null> {
    const url = `/subscribers/${id}/unsubscribe`;

    return await this.api.post<{} | null>(url);
  }

  /**
   * Get the associated Tags for a Subscriber.
   *
   * @param id - The unique ID of the Subscriber.
   * @param params - Optional parameters to filter by.
   *
   * @see {@link https://developers.kit.com/v4#list-tags-for-a-subscriber}
   *
   * @returns The Subscribers' Tags if the Subscriber exists;
   * Otheriwse `null` if the Subscriber does not exist.
   */
  public async getTags(
    id: number,
    params?: GetSubscriberTagsParams
  ): Promise<GetSubscriberTags | null> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    const url = `/subscribers/${id}/tags`;

    return await this.api.get<GetSubscriberTags | null>(url, { query });
  }
}

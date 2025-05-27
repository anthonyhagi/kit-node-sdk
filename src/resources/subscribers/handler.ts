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
   *
   * @param params
   * @returns
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

  public async create(
    params: CreateSubscriberParams
  ): Promise<CreateSubscriber> {
    const body = JSON.stringify(params || {});

    const url = "/subscribers";

    return await this.api.post<CreateSubscriber>(url, { body });
  }

  public async get(id: number): Promise<GetSubscriber | null> {
    const url = `/subscribers/${id}`;

    return await this.api.get<GetSubscriber | null>(url);
  }

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
   * @param id
   * @returns
   */
  public async unsubscribe(id: number): Promise<{} | null> {
    const url = `/subscribers/${id}/unsubscribe`;

    return await this.api.post<{} | null>(url);
  }

  /**
   * Get the associated Tags for a Subscriber.
   *
   * @param id
   * @param params
   * @returns
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

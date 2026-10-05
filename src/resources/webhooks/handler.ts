import type { Kit, RequestOptions } from "~/index";
import type {
  CreateWebhook,
  CreateWebhookParams,
  ListWebhooks,
  ListWebhooksParams,
} from "./types";

export class WebhooksHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Get a paginated list of all Webhooks.
   *
   * @param params - Optional parameters to filter by.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/webhooks/list-webhooks}
   *
   * @returns The paginated list of Webhooks.
   */
  public async list(
    params?: ListWebhooksParams,
    options?: RequestOptions
  ): Promise<ListWebhooks> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListWebhooks>("/webhooks", {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Create a new Webhook.
   *
   * @param params - The required parameters to create a new Webhook.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/webhooks/create-a-webhook}
   *
   * @returns The newly created Webhook.
   */
  public async create(
    params: CreateWebhookParams,
    options?: RequestOptions
  ): Promise<CreateWebhook> {
    const body = JSON.stringify(params || {});

    return await this.api.post<CreateWebhook>("/webhooks", {
      body,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Delete a Webhook.
   *
   * @param id - The unique ID of the Webhook to delete.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/webhooks/delete-a-webhook}
   *
   * @returns An empty object on successful deletion, otherwise `null`
   * if the Webhook was not found.
   */
  public async delete(
    id: number,
    options?: RequestOptions
  ): Promise<{} | null> {
    return await this.api.delete<{} | null>(`/webhooks/${id}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

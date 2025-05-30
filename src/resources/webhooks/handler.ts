import type { Kit } from "~/index";
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
   *
   * @see {@link https://developers.kit.com/v4#list-webhooks}
   *
   * @returns The paginated list of Webhooks.
   */
  public async list(params?: ListWebhooksParams): Promise<ListWebhooks> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListWebhooks>("/webhooks", { query });
  }

  /**
   * Create a new Webhook.
   *
   * @params params - The required parameters to create a new Webhook.
   *
   * @see {@link https://developers.kit.com/v4#create-a-webhook}
   *
   * @returns The newly created Webhook.
   */
  public async create(params: CreateWebhookParams): Promise<CreateWebhook> {
    const body = JSON.stringify(params || {});

    return await this.api.post<CreateWebhook>("/webhooks", { body });
  }

  /**
   * Delete a Webhook.
   *
   * @param id - The unique ID of the Webhook to delete.
   *
   * @see {@link https://developers.kit.com/v4#delete-a-webhook}
   *
   * @returns An empty object on successful deletion, otherwise `null`
   * if the Webhook was not found.
   */
  public async delete(id: number): Promise<{} | null> {
    return await this.api.delete<{} | null>(`/webhooks/${id}`);
  }
}

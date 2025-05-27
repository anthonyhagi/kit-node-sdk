import type { Kit } from "~/index";
import type {
  CreateWebhook,
  CreateWebhookParams,
  DeleteWebhook,
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
   * @param params Optional parameters to filter by.
   *
   * @returns The paginated list of Webhooks.
   * @see {@link https://developers.kit.com/v4#list-webhooks}
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
   * @params params The required parameters to create a new Webhook.
   *
   * @throws Error when required parameters are missing.
   *
   * @returns The newly created Webhook.
   * @see {@link https://developers.kit.com/v4#create-a-webhook}
   */
  public async create(params: CreateWebhookParams): Promise<CreateWebhook> {
    const body = JSON.stringify(params);

    return await this.api.post<CreateWebhook>("/webhooks", { body });
  }

  /**
   * Delete a Webhook.
   *
   * @param id The unique ID of the Webhook to delete.
   *
   * @returns An empty object on successful deletion, otherwise `null`
   * if the Webhook was not found.
   * @see {@link https://developers.kit.com/v4#delete-a-webhook}
   */
  public async delete(id: number): Promise<DeleteWebhook | null> {
    return await this.api.delete<DeleteWebhook | null>(`/webhooks/${id}`);
  }
}

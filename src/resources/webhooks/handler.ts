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
   *
   * @param params
   * @returns
   */
  public async list(params?: ListWebhooksParams): Promise<ListWebhooks> {
    const { after, before, includeTotalCount, perPage } = params || {};

    const url = "/webhooks";

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(includeTotalCount && {
        include_total_count: String(includeTotalCount),
      }),
      ...(perPage && { per_page: String(perPage) }),
    });

    return await this.api.get<ListWebhooks>(url, { query });
  }

  /**
   * Create a new Webhook.
   *
   * @returns
   */
  public async create(params: CreateWebhookParams): Promise<CreateWebhook> {
    const url = "/webhooks";

    const body = JSON.stringify(params);

    return await this.api.post<CreateWebhook>(url, { body });
  }

  /**
   * Delete the unique Webhook.
   *
   * @param id The unique ID of the Webhook to delete.
   *
   * @returns An empty object, otherwise `null` if the Webhook was
   * not found.
   */
  public async delete(id: number): Promise<DeleteWebhook | null> {
    const url = `/webhooks/${id}`;

    return await this.api.delete<DeleteWebhook | null>(url);
  }
}

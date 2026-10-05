import type { Kit, RequestOptions } from "~/index";
import { paginationQuery } from "~/utils/pagination";
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
    const query = new URLSearchParams(paginationQuery(params));

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
   * @returns Resolves without a value on success.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   */
  public async delete(id: number, options?: RequestOptions): Promise<void> {
    await this.api.delete<void>(`/webhooks/${id}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

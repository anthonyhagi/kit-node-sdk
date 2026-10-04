import type { Kit } from "~/index";
import type {
  GetWebhookEndpoint,
  ListWebhookEndpoints,
  ListWebhookEndpointsParams,
} from "./types";

export class WebhookEndpointsHandler {
  constructor(private api: Kit) {}

  /**
   * Get webhook endpoint metadata without the signing secret.
   *
   * @param id - The webhook endpoint to retrieve.
   * @returns The endpoint, or null when it was not found or is inaccessible.
   * @see {@link https://developers.kit.com/api-reference/webhooks/get-a-webhook-endpoint}
   */
  public async get(id: number): Promise<GetWebhookEndpoint | null> {
    return await this.api.get<GetWebhookEndpoint | null>(
      `/webhook_endpoints/${id}`
    );
  }

  /**
   * List webhook endpoints, optionally filtered by active or disabled status.
   *
   * @param params - Optional pagination and status parameters.
   * @returns A page of webhook endpoint metadata, without signing secrets.
   * @see {@link https://developers.kit.com/api-reference/webhooks/list-webhook-endpoints}
   */
  public async list(
    params?: ListWebhookEndpointsParams
  ): Promise<ListWebhookEndpoints> {
    const { after, before, include_total_count, per_page, status } =
      params || {};
    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page !== undefined && { per_page: String(per_page) }),
      ...(status && { status }),
    });
    return await this.api.get<ListWebhookEndpoints>("/webhook_endpoints", {
      query,
    });
  }
}

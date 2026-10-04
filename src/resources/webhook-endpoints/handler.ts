import type { Kit } from "~/index";
import type {
  CreateWebhookEndpoint,
  CreateWebhookEndpointParams,
  GetWebhookEndpoint,
  ListWebhookEndpoints,
  ListWebhookEndpointsParams,
  UpdateWebhookEndpoint,
  UpdateWebhookEndpointParams,
} from "./types";

export class WebhookEndpointsHandler {
  constructor(private api: Kit) {}

  /**
   * Update supplied endpoint fields; events replace the full subscription list.
   *
   * @param id - The webhook endpoint to update.
   * @param params - Metadata, status, or subscription changes.
   * @returns The updated endpoint, or null when it was not found.
   * @see {@link https://developers.kit.com/api-reference/webhooks/update-a-webhook-endpoint}
   */
  public async update(
    id: number,
    params: UpdateWebhookEndpointParams
  ): Promise<UpdateWebhookEndpoint | null> {
    return await this.api.patch<UpdateWebhookEndpoint | null>(
      `/webhook_endpoints/${id}`,
      { body: JSON.stringify(params) }
    );
  }

  /**
   * Create an endpoint subscribed to the supplied event types.
   *
   * @param params - Delivery URL, events, and optional name and description.
   * @returns The created endpoint and its signing secret, which must be saved.
   * @see {@link https://developers.kit.com/api-reference/webhooks/create-a-webhook-endpoint}
   */
  public async create(
    params: CreateWebhookEndpointParams
  ): Promise<CreateWebhookEndpoint> {
    return await this.api.post<CreateWebhookEndpoint>("/webhook_endpoints", {
      body: JSON.stringify(params),
    });
  }

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

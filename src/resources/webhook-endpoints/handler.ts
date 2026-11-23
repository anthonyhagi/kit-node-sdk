import type { Kit, RequestOptions } from "~/index";
import { paginationQuery } from "~/utils/pagination";
import type {
  CreateWebhookEndpoint,
  CreateWebhookEndpointParams,
  GetWebhookDelivery,
  GetWebhookDeliveryParams,
  GetWebhookEndpoint,
  ListWebhookDeliveries,
  ListWebhookDeliveriesParams,
  ListWebhookEndpoints,
  ListWebhookEndpointsParams,
  RevokePreviousWebhookEndpointSecret,
  RotateWebhookEndpointSecret,
  RotateWebhookEndpointSecretParams,
  UpdateWebhookEndpoint,
  UpdateWebhookEndpointParams,
} from "./types";

export class WebhookEndpointsHandler {
  constructor(private api: Kit) {}

  /**
   * List an endpoint's deliveries, newest first, within the 30-day retention window.
   * OAuth can access only endpoints created by its app; API keys can access all
   * endpoints on the account. Returns null for missing or inaccessible endpoints.
   * @see https://developers.kit.com/api-reference/webhooks/list-webhook-deliveries
   */
  public async listDeliveries(
    id: number,
    params?: ListWebhookDeliveriesParams,
    options?: RequestOptions
  ): Promise<ListWebhookDeliveries | null> {
    const { status, event_type } = params || {};
    const query = new URLSearchParams({
      ...paginationQuery(params, { includeZeroPageSize: true }),
      ...(status && { status }),
      ...(event_type && { event_type }),
    });
    return await this.api.get<ListWebhookDeliveries | null>(
      `/webhook_endpoints/${id}/deliveries`,
      { query, signal: options?.signal, maxRetries: options?.maxRetries }
    );
  }

  /**
   * Get delivery metadata and attempts; payload is omitted unless requested.
   * Returns null for missing, expired, mismatched, or inaccessible deliveries.
   * OAuth visibility is limited to endpoints created by the current app.
   * @see https://developers.kit.com/api-reference/webhooks/get-webhook-delivery-details
   */
  public async getDelivery(
    id: number,
    deliveryId: number,
    params?: GetWebhookDeliveryParams,
    options?: RequestOptions
  ): Promise<GetWebhookDelivery | null> {
    const query = new URLSearchParams({
      ...(params?.include_payload !== undefined && {
        include_payload: String(params.include_payload),
      }),
    });
    return await this.api.get<GetWebhookDelivery | null>(
      `/webhook_endpoints/${id}/deliveries/${deliveryId}`,
      { query, signal: options?.signal, maxRetries: options?.maxRetries }
    );
  }

  /**
   * Revoke the previous signing secret and close the rotation overlap window.
   *
   * @param id - The webhook endpoint whose previous secret should be revoked.
   * @param options - Optional request controls, including cancellation.
   * @returns Endpoint metadata, or null when it was not found.
   * @see {@link https://developers.kit.com/api-reference/webhooks/revoke-the-previous-webhook-endpoint-secret}
   */
  public async revokePreviousSecret(
    id: number,
    options?: RequestOptions
  ): Promise<RevokePreviousWebhookEndpointSecret | null> {
    return await this.api.post<RevokePreviousWebhookEndpointSecret | null>(
      `/webhook_endpoints/${id}/revoke_previous_secret`,
      { signal: options?.signal, maxRetries: options?.maxRetries }
    );
  }

  /**
   * Rotate the signing secret and return the new secret and overlap expiry.
   * Automatic retries default to 0: repeating an uncertain rotation can return
   * 409, or expire an older secret immediately when force is true. Request
   * options can explicitly override the retry limit.
   *
   * @param id - The webhook endpoint whose secret should rotate.
   * @param params - Optional force flag for rotation during an open overlap window.
   * @param options - Optional request controls, including cancellation.
   * @returns The rotated endpoint, or null when it was not found.
   * @see {@link https://developers.kit.com/api-reference/webhooks/rotate-a-webhook-endpoint-secret}
   */
  public async rotateSecret(
    id: number,
    params?: RotateWebhookEndpointSecretParams,
    options?: RequestOptions
  ): Promise<RotateWebhookEndpointSecret | null> {
    return await this.api.post<RotateWebhookEndpointSecret | null>(
      `/webhook_endpoints/${id}/rotate_secret`,
      {
        body: JSON.stringify(params || {}),
        signal: options?.signal,
        maxRetries: options?.maxRetries ?? 0,
      }
    );
  }

  /**
   * Delete an endpoint and stop future deliveries of its subscribed events.
   *
   * @param id - The webhook endpoint to delete.
   * @param options - Optional request controls, including cancellation.
   * @returns An empty object on success, or null when it was not found or is inaccessible.
   * @see {@link https://developers.kit.com/api-reference/webhooks/delete-a-webhook-endpoint}
   */
  public async delete(
    id: number,
    options?: RequestOptions
  ): Promise<{} | null> {
    return await this.api.delete<{} | null>(`/webhook_endpoints/${id}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Update supplied endpoint fields; events replace the full subscription list.
   *
   * @param id - The webhook endpoint to update.
   * @param params - Metadata, status, or subscription changes.
   * @param options - Optional request controls, including cancellation.
   * @returns The updated endpoint, or null when it was not found.
   * @see {@link https://developers.kit.com/api-reference/webhooks/update-a-webhook-endpoint}
   */
  public async update(
    id: number,
    params: UpdateWebhookEndpointParams,
    options?: RequestOptions
  ): Promise<UpdateWebhookEndpoint | null> {
    return await this.api.patch<UpdateWebhookEndpoint | null>(
      `/webhook_endpoints/${id}`,
      {
        body: JSON.stringify(params),
        signal: options?.signal,
        maxRetries: options?.maxRetries,
      }
    );
  }

  /**
   * Create an endpoint subscribed to the supplied event types.
   *
   * @param params - Delivery URL, events, and optional name and description.
   * @param options - Optional request controls, including cancellation.
   * @returns The created endpoint and its signing secret, which must be saved.
   * @see {@link https://developers.kit.com/api-reference/webhooks/create-a-webhook-endpoint}
   */
  public async create(
    params: CreateWebhookEndpointParams,
    options?: RequestOptions
  ): Promise<CreateWebhookEndpoint> {
    return await this.api.post<CreateWebhookEndpoint>("/webhook_endpoints", {
      body: JSON.stringify(params),
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Get webhook endpoint metadata without the signing secret.
   *
   * @param id - The webhook endpoint to retrieve.
   * @param options - Optional request controls, including cancellation.
   * @returns The endpoint, or null when it was not found or is inaccessible.
   * @see {@link https://developers.kit.com/api-reference/webhooks/get-a-webhook-endpoint}
   */
  public async get(
    id: number,
    options?: RequestOptions
  ): Promise<GetWebhookEndpoint | null> {
    return await this.api.get<GetWebhookEndpoint | null>(
      `/webhook_endpoints/${id}`,
      { signal: options?.signal, maxRetries: options?.maxRetries }
    );
  }

  /**
   * List webhook endpoints, optionally filtered by active or disabled status.
   * OAuth sees only endpoints created by its app; API keys see all account endpoints.
   *
   * @param params - Optional pagination and status parameters.
   * @param options - Optional request controls, including cancellation.
   * @returns A page of webhook endpoint metadata, without signing secrets.
   * @see {@link https://developers.kit.com/api-reference/webhooks/list-webhook-endpoints}
   */
  public async list(
    params?: ListWebhookEndpointsParams,
    options?: RequestOptions
  ): Promise<ListWebhookEndpoints> {
    const { status } = params || {};
    const query = new URLSearchParams({
      ...paginationQuery(params, { includeZeroPageSize: true }),
      ...(status && { status }),
    });
    return await this.api.get<ListWebhookEndpoints>("/webhook_endpoints", {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

import type { Kit, RequestOptions } from "~/index";
import type {
  CreateWebhookEndpoint,
  CreateWebhookEndpointParams,
  GetWebhookEndpoint,
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
      { signal: options?.signal }
    );
  }

  /**
   * Rotate the signing secret and return the new secret and overlap expiry.
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
      { body: JSON.stringify(params || {}), signal: options?.signal }
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
      { body: JSON.stringify(params), signal: options?.signal }
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
      { signal: options?.signal }
    );
  }

  /**
   * List webhook endpoints, optionally filtered by active or disabled status.
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
      signal: options?.signal,
    });
  }
}

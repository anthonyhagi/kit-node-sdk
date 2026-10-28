import type { Pagination, PaginationParams } from "~/common/types";
import type {
  WebhookDeliveryEvent,
  WebhookEndpointEventType,
} from "~/webhook-delivery";

export type WebhookEndpointStatus = "active" | "disabled";

export interface CreateWebhookEndpointParams {
  /** Publicly reachable HTTP(S) URL for webhook deliveries. */
  url: string;
  events: string[];
  name?: string | undefined;
  description?: string | undefined;
}

export interface CreateWebhookEndpoint {
  webhook_endpoint: WebhookEndpoint & {
    /** Save this signing secret; subsequent list/get responses omit it. */
    secret: string;
  };
}

export interface ListWebhookEndpointsParams extends PaginationParams {
  status?: WebhookEndpointStatus | undefined;
}

/** Endpoint metadata; list and get responses never include the signing secret. */
export interface WebhookEndpoint {
  id: number;
  name: string;
  url: string;
  events: string[];
  status: string;
  source: string;
  description: string;
  /** Kit leaves the nullable app metadata's structure unspecified. */
  created_by_app: unknown;
  created_at: string;
  previous_secret_expires_at: string | null;
}

export interface ListWebhookEndpoints {
  webhook_endpoints: WebhookEndpoint[];
  pagination: Pagination;
}

export interface GetWebhookEndpoint {
  webhook_endpoint: WebhookEndpoint;
}

/** Only supplied fields change. */
export interface UpdateWebhookEndpointParams {
  name?: string | undefined;
  url?: string | undefined;
  description?: string | undefined;
  status?: WebhookEndpointStatus | undefined;
  /** Replaces the entire event subscription list. */
  events?: string[] | undefined;
}

export type UpdateWebhookEndpoint = GetWebhookEndpoint;

export interface RotateWebhookEndpointSecretParams {
  /** Rotate during an open overlap window, immediately expiring the older secret. */
  force?: boolean | undefined;
}

export interface RotateWebhookEndpointSecret {
  webhook_endpoint: Omit<WebhookEndpoint, "previous_secret_expires_at"> & {
    /** New signing secret; save it for signature verification. */
    secret: string;
    /** The previous signing secret remains valid until this timestamp. */
    previous_secret_expires_at: string;
  };
}

export interface RevokePreviousWebhookEndpointSecret {
  webhook_endpoint: Omit<WebhookEndpoint, "previous_secret_expires_at"> & {
    /** The previous secret has been revoked and the overlap window is closed. */
    previous_secret_expires_at: null;
  };
}

export type WebhookDeliveryStatus =
  "pending" | "delivered" | "failed" | "retrying";

export interface ListWebhookDeliveriesParams extends Omit<
  PaginationParams,
  "include_total_count"
> {
  status?: WebhookDeliveryStatus | undefined;
  event_type?: WebhookEndpointEventType | undefined;
}

/** A retained delivery record, distinct from the incoming WebhookDelivery envelope. */
export interface WebhookDeliveryRecord {
  id: number;
  event_type: string;
  status: string;
  attempt_count: number;
  created_at: string;
  /** Timestamp when delivered or failed; null before completion. */
  completed_at: string | null;
}

export interface WebhookDeliveryAttempt {
  id: number;
  attempt_number: number;
  status_code: number | null;
  error_message: string | null;
  response_body: string | null;
  duration_ms: number | null;
  attempted_at: string;
}

export interface WebhookDeliveryDetails extends WebhookDeliveryRecord {
  /** Newest attempt first. */
  attempts: WebhookDeliveryAttempt[];
  /** Same events array sent to the endpoint; returned only with include_payload=true. */
  payload?: WebhookDeliveryEvent[] | undefined;
}

export interface ListWebhookDeliveries {
  /** Newest delivery first; history is retained for 30 days. */
  deliveries: WebhookDeliveryRecord[];
  pagination: Pagination;
}

export interface GetWebhookDeliveryParams {
  /** Include the events sent in this delivery. Omitted by default. */
  include_payload?: boolean | undefined;
}

export interface GetWebhookDelivery {
  delivery: WebhookDeliveryDetails;
}

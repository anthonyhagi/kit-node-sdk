import type { Pagination } from "~/common/types";

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

export interface ListWebhookEndpointsParams {
  /** Cursor from the previous page's end_cursor. */
  after?: string | undefined;
  /** Cursor from the next page's start_cursor. */
  before?: string | undefined;
  include_total_count?: boolean | undefined;
  /** Number of results per page. Default 500, maximum 1000. */
  per_page?: number | undefined;
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

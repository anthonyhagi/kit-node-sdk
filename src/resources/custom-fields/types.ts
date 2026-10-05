import type { Pagination } from "~/common/types";

export interface BulkCreateParams {
  custom_fields: {
    label: string;
  }[];
  callback_url?: string | null | undefined;
}

export interface BulkCreateAsynchronous {
  type: "asynchronous";
}

/** Completed results posted by Kit to callback_url, without the SDK discriminator. */
export type BulkCreateCallback = Omit<BulkCreateSynchronous, "type">;

export interface BulkCreateSynchronous {
  type: "synchronous";
  custom_fields: {
    id: number;
    label: string;
    key: string;
    name: string;
    created_at: string;
  }[];
  failures: {
    custom_field: {
      id: number;
      label: string;
      key: string;
      name: string;
      created_at: string;
    };
    errors: string[];
  }[];
}

export type BulkCreate = BulkCreateAsynchronous | BulkCreateSynchronous;
export type BulkCreateWithoutResponseType =
  Omit<BulkCreateAsynchronous, "type"> | Omit<BulkCreateSynchronous, "type">;

export interface ListCustomFieldsParams {
  /**
   * Pass in the string from the previous request to move
   * the cursor. This can be found in the following field:
   *
   * @example after: pagination.end_cursor
   */
  after?: string | undefined;

  /**
   * Pass in the string from the previous request to move
   * the cursor. This can be found in the following field:
   *
   * @example after: pagination.start_cursor
   */
  before?: string | undefined;

  /**
   * To include the total count of records in the response,
   * use `true`. For large collections, expect a slightly
   * slower response.
   *
   * @example includeTotalCount: true
   */
  include_total_count?: boolean | undefined;

  /**
   * Number of results per page. Default 500, maximum 1000.
   *
   * @example per_page: 500
   */
  per_page?: number | undefined;
}

export interface ListCustomFields {
  custom_fields: {
    id: number;
    name: string;
    key: string;
    label: string;
  }[];
  pagination: Pagination;
}

export interface CreateCustomFieldParams {
  label: string;
}

export interface CreateCustomField {
  custom_field: {
    id: number;
    name: string;
    key: string;
    label: string;
  };
}

export interface UpdateCustomFieldParams {
  label: string;
}

export interface UpdateCustomField {
  custom_field: {
    id: number;
    name: string;
    key: string;
    label: string;
  };
}

export interface BulkUpdateSubscriberValuesParams {
  custom_field_values: {
    subscriber_id: number | null;
    subscriber_custom_field_id: number;
    value: string;
  }[];
  /** Callback URL for asynchronous results; pass null when no callback is needed. */
  callback_url: string | null;
}

/** Completed results posted by Kit to callback_url, without the SDK discriminator. */
export type BulkUpdateSubscriberValuesCallback = Omit<
  BulkUpdateSubscriberValuesSynchronous,
  "type"
>;

export interface BulkUpdateSubscriberValuesSynchronous {
  type: "synchronous";
  custom_field_values: {
    subscriber_id: number;
    subscriber_custom_field_id: number;
    value: string;
  }[];
  failures: {
    errors: string[];
    custom_field_value: BulkUpdateSubscriberValuesParams["custom_field_values"][number];
  }[];
}

export interface BulkUpdateSubscriberValuesAsynchronous {
  type: "asynchronous";
}

export type BulkUpdateSubscriberValues =
  | BulkUpdateSubscriberValuesSynchronous
  | BulkUpdateSubscriberValuesAsynchronous;

export type BulkUpdateSubscriberValuesWithoutResponseType =
  | Omit<BulkUpdateSubscriberValuesSynchronous, "type">
  | Omit<BulkUpdateSubscriberValuesAsynchronous, "type">;

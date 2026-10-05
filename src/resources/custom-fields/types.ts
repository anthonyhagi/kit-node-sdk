import type { Pagination, PaginationParams } from "~/common/types";

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

export interface ListCustomFieldsParams extends PaginationParams {}

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

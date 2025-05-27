import type { Pagination, SubscriberState } from "~/common/types";

export interface BulkCreateSubscribersParams {
  subscribers: {
    first_name: string;
    email_address: string;
    state: SubscriberState;
  }[];
  callback_url?: string | null | undefined;
}

export interface BulkCreateSubscribersSynchronous {
  type: "synchronous";
  subscribers: {
    id: number;
    first_name: string | null;
    email_address: string;
    state: SubscriberState;
    created_at: string;
  }[];
  failures: {
    subscriber: {
      first_name: string | null;
      email_address: string | null;
      state: SubscriberState | null;
      created_at: string | null;
    };
    errors: string[];
  }[];
}

export interface BulkCreateSubscribersAsynchronous {
  type: "asynchronous";
}

export type BulkCreateSubscribers =
  | BulkCreateSubscribersSynchronous
  | BulkCreateSubscribersAsynchronous;

export type BulkCreateSubscribersWithoutType =
  | Omit<BulkCreateSubscribersSynchronous, "type">
  | Omit<BulkCreateSubscribersAsynchronous, "type">;

export interface ListSubscribersParams {
  after?: string | undefined;
  before?: string | undefined;
  created_after?: Date | string | undefined;
  created_before?: Date | string | undefined;
  email_address?: string | undefined;
  include_total_count?: boolean | undefined;
  per_page?: number | undefined;
  sort_field?: "id" | "updated_at" | "cancelled_at" | (string & {}) | undefined;
  sort_order?: "asc" | "desc" | undefined;
  status?: SubscriberState | "all" | undefined;
  updated_after?: Date | string | undefined;
  updated_before?: Date | string | undefined;
}

export interface ListSubscribers {
  subscribers: {
    id: number;
    first_name: string;
    email_address: string;
    state: SubscriberState;
    created_at: string;
    fields: Record<string, string>;
  }[];
  pagination: Pagination;
}

export interface CreateSubscriberParams {
  first_name?: string | null | undefined;
  email_address: string;
  state?: SubscriberState | (string & {}) | null | undefined;
  fields?: Record<string, string> | null | undefined;
}

export interface CreateSubscriber {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: SubscriberState;
    created_at: string;
    fields: Record<string, string>;
  };
}

export interface GetSubscriber {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: SubscriberState;
    created_at: string;
    fields: Record<string, string>;
  };
}

export interface UpdateSubscriberParams {
  first_name?: string | null | undefined;
  email_address: string;
  fields?: Record<string, string> | null | undefined;
}

export interface UpdateSubscriber {
  subscriber: {
    id: number;
    first_name: string;
    email_address: string;
    state: SubscriberState;
    created_at: string;
    fields: Record<string, string>;
  };
}

export interface GetSubscriberTagsParams {
  after?: string | undefined;
  before?: string | undefined;
  include_total_count?: boolean | undefined;
  per_page?: number | undefined;
}

export interface GetSubscriberTags {
  tags: {
    id: number;
    name: string;
    added_at?: string | undefined;
    tagged_at?: string | undefined;
  }[];
  pagination: Pagination;
}

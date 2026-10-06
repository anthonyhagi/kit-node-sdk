import type {
  Pagination,
  PaginationParams,
  SubscriberState,
} from "~/common/types";
import type { Subscriber } from "~/resources/subscribers/types";

export type SequenceSendDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface CreateSequenceParams {
  name: string;
  /** Defaults to the account's sending address when omitted. */
  email_address?: string | undefined;
  email_template_id?: number | undefined;
  send_days?: SequenceSendDay[] | undefined;
  /** An integer from 0 to 23. Kit validates the range. */
  send_hour?: number | undefined;
  /** An IANA timezone name; defaults to the account timezone. */
  time_zone?: string | undefined;
  active?: boolean | undefined;
  /** Allow subscribers to restart the sequence. */
  repeat?: boolean | undefined;
  /** Keep Visual Automation subscribers in the sequence after its last email. */
  hold?: boolean | undefined;
  exclude_subscriber_sources?:
    | {
        type: "tag" | "sequence" | "form" | "segment";
        ids: number[];
      }[]
    | undefined;
}

export interface CreateSequence {
  sequence: Omit<Sequence, "stats">;
}

/** Only supplied fields change; omitted fields retain their current values. */
export type UpdateSequenceParams = Partial<CreateSequenceParams>;

export interface UpdateSequence {
  sequence: Omit<Sequence, "stats">;
}

export interface GetSequenceParams {
  /** Include deliverability statistics alongside the sequence details. */
  include?: "stats" | undefined;
}

/** Deliverability fields may be null when the sequence has no delivery data. */
export interface SequenceStats {
  /** Current cancelled sequence subscriptions, distinct from email events. */
  unsubscribers?: number | undefined;
  recipients?: number | null | undefined;
  opens?: number | null | undefined;
  clicks?: number | null | undefined;
  email_unsubscribes?: number | null | undefined;
  bounces?: number | null | undefined;
  complaints?: number | null | undefined;
  open_rate?: number | null | undefined;
  click_rate?: number | null | undefined;
  click_to_open_rate?: number | null | undefined;
  unsubscribe_rate?: number | null | undefined;
  bounce_rate?: number | null | undefined;
  complaint_rate?: number | null | undefined;
}

/** Full sequence details; counts and requested deliverability statistics may be omitted. */
export interface Sequence {
  id: number;
  name: string;
  hold: boolean;
  repeat: boolean;
  created_at: string;
  updated_at: string;
  email_address: string | null;
  email_template_id: number | null;
  send_days: string[];
  send_hour: number;
  time_zone: string;
  active: boolean;
  exclude_subscriber_sources: { type: string; ids: number[] }[];
  email_count?: number | undefined;
  subscriber_count?: number | undefined;
  /** Returned only when requested with include: "stats". */
  stats?: SequenceStats | undefined;
}

export interface GetSequence {
  sequence: Sequence;
}

export interface ListSequencesParams
  extends GetSequenceParams, PaginationParams {}

/** List responses require core metadata; additional sequence details are optional. */
export type SequenceListItem = Pick<
  Sequence,
  "id" | "name" | "hold" | "repeat" | "created_at"
> &
  Partial<Omit<Sequence, "id" | "name" | "hold" | "repeat" | "created_at">>;

export interface ListSequences {
  sequences: SequenceListItem[];
  pagination: Pagination;
}

export interface ListSequenceSubscribersParams {
  /** Added after this date (YYYY-MM-DD). Date objects use their UTC calendar date. */
  added_after?: Date | string | null | undefined;
  /** Added before this date (YYYY-MM-DD). Date objects use their UTC calendar date. */
  added_before?: Date | string | null | undefined;
  after?: string | null | undefined;
  before?: string | null | undefined;
  /** Created after this date (YYYY-MM-DD). Date objects use their UTC calendar date. */
  created_after?: Date | string | null | undefined;
  /** Created before this date (YYYY-MM-DD). Date objects use their UTC calendar date. */
  created_before?: Date | string | null | undefined;
  include_total_count?: boolean | undefined;
  per_page?: number | null | undefined;
  status?: SubscriberState | "all" | (string & {}) | undefined;
}

/** Subscriber record returned by sequence subscriber lists. */
export interface SequenceSubscriber extends Omit<
  Subscriber,
  "email_address" | "state"
> {
  email_address: string | null;
  state: string;
  added_at: string;
}

/** Add responses retain non-null email addresses and custom field values. */
interface AddedSequenceSubscriber extends Omit<
  SequenceSubscriber,
  "email_address" | "fields"
> {
  email_address: string;
  fields: Record<string, string>;
}

export interface ListSequenceSubscribers {
  subscribers: SequenceSubscriber[];
  pagination: Pagination;
}

export interface AddSubscriberByEmailParams {
  email_address: string;
}

export interface AddSubscriberToSequence {
  subscriber: AddedSequenceSubscriber;
}

/** Sequence reads explicitly requested with include: "stats". */
export interface GetSequenceWithStats extends Omit<GetSequence, "sequence"> {
  sequence: Omit<Sequence, "stats"> & { stats: SequenceStats };
}

/** Sequence lists explicitly requested with include: "stats". */
export interface ListSequencesWithStats extends Omit<
  ListSequences,
  "sequences"
> {
  sequences: (Omit<SequenceListItem, "stats"> & { stats: SequenceStats })[];
}

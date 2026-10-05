import type { Pagination } from "~/common/types";
import type {
  ListSequencesParams,
  SequenceSendDay,
} from "~/resources/sequences/types";

export interface CreateSequenceEmailParams {
  subject: string;
  delay_value: number;
  delay_unit: "days" | "hours";
  preview_text?: string | null | undefined;
  content?: string | null | undefined;
  email_template_id?: number | null | undefined;
  /** Emails are drafts by default. */
  published?: boolean | undefined;
  /** Day-based schedule override; hour-based emails ignore the schedule. */
  send_days?: SequenceSendDay[] | null | undefined;
  /** Omitted positions append the email to the sequence. */
  position?: number | null | undefined;
}

export interface CreateSequenceEmail {
  email: Omit<GetSequenceEmail["email"], "stats" | "position"> & {
    /** Kit may return a null position when creating an email. */
    position: number | null;
  };
}

/** Only supplied fields change; omitted fields retain their existing values. */
export interface UpdateSequenceEmailParams {
  subject?: string | undefined;
  preview_text?: string | null | undefined;
  content?: string | null | undefined;
  delay_value?: number | undefined;
  delay_unit?: "days" | "hours" | undefined;
  email_template_id?: number | null | undefined;
  published?: boolean | undefined;
  /** Day-based emails only; null resets the per-email schedule override. */
  send_days?: SequenceSendDay[] | null | undefined;
  position?: number | null | undefined;
}

export interface UpdateSequenceEmail {
  email: Omit<CreateSequenceEmail["email"], "position"> & {
    position: number | null;
  };
}

export interface ListSequenceEmailsParams extends Omit<
  ListSequencesParams,
  "after" | "before" | "per_page"
> {
  /** Cursor from the previous page's end_cursor; null is omitted. */
  after?: string | null | undefined;
  /** Cursor from the next page's start_cursor; null is omitted. */
  before?: string | null | undefined;
  /** Number of results per page. Default 500, maximum 1000; null is omitted. */
  per_page?: number | null | undefined;
  /** Include each email's HTML content; omitted by default. Null is omitted. */
  include_content?: boolean | null | undefined;
}

/** Per-email metrics are zero when there is no deliverability data. */
export interface SequenceEmailStats {
  recipients?: number | undefined;
  opens?: number | undefined;
  clicks?: number | undefined;
  email_unsubscribes?: number | undefined;
  bounces?: number | undefined;
  complaints?: number | undefined;
  open_rate?: number | undefined;
  click_rate?: number | undefined;
  click_to_open_rate?: number | undefined;
  unsubscribe_rate?: number | undefined;
  bounce_rate?: number | undefined;
  complaint_rate?: number | undefined;
}

export interface SequenceEmailListItem {
  id: number;
  sequence_id: number;
  subject: string;
  preview_text: string | null;
  email_address: string;
  email_template_id: number | null;
  published: boolean;
  position: number;
  delay_value: number;
  delay_unit: string;
  send_days: string[] | null;
  /** Included when requested with include_content: true. */
  content?: string | null | undefined;
  /** Included when requested with include: "stats". */
  stats?: SequenceEmailStats | undefined;
}

export interface ListSequenceEmails {
  emails: SequenceEmailListItem[];
  pagination: Pagination;
}

/** Email lists requested with include_content: true include nullable HTML content. */
export interface ListSequenceEmailsWithContent extends Omit<
  ListSequenceEmails,
  "emails"
> {
  emails: GetSequenceEmail["email"][];
}

export type GetSequenceEmailParams = Pick<ListSequenceEmailsParams, "include">;

export interface GetSequenceEmail {
  email: Omit<SequenceEmailListItem, "content"> & {
    /** Single-email reads always include this field; draft content may be null. */
    content: string | null;
  };
}

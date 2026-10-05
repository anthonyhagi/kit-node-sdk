import type { Pagination, PaginationParams } from "~/common/types";
import type {
  GetSequenceParams,
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

/** Write responses omit stats and may return a null position. */
type WrittenSequenceEmail = Omit<SequenceEmail, "stats" | "position"> & {
  position: number | null;
};

export interface CreateSequenceEmail {
  email: WrittenSequenceEmail;
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
  email: WrittenSequenceEmail;
}

export interface ListSequenceEmailsParams
  extends PaginationParams, GetSequenceParams {
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
  emails: SequenceEmail[];
}

export type GetSequenceEmailParams = Pick<ListSequenceEmailsParams, "include">;

/** Full sequence email record returned by reads and lists requesting content. */
export type SequenceEmail = Omit<SequenceEmailListItem, "content"> & {
  /** Full reads always include this field; draft content may be null. */
  content: string | null;
};

export interface GetSequenceEmail {
  email: SequenceEmail;
}

/** Email reads explicitly requested with include: "stats". */
export interface GetSequenceEmailWithStats extends Omit<
  GetSequenceEmail,
  "email"
> {
  email: Omit<SequenceEmail, "stats"> & {
    stats: SequenceEmailStats;
  };
}

/** Email lists explicitly requested with include: "stats". */
export interface ListSequenceEmailsWithStats extends Omit<
  ListSequenceEmails,
  "emails"
> {
  emails: (Omit<SequenceEmailListItem, "stats"> & {
    stats: SequenceEmailStats;
  })[];
}

/** Email lists explicitly requesting both content and stats. */
export interface ListSequenceEmailsWithContentAndStats extends Omit<
  ListSequenceEmails,
  "emails"
> {
  emails: GetSequenceEmailWithStats["email"][];
}

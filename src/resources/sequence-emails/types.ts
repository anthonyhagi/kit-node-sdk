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

/**
 * Only supplied fields change; omitted fields retain their existing values.
 * On a published email, `content` and `email_template_id` changes are saved as
 * a draft until you send `published: true`; reads keep returning the live
 * values and set `has_unpublished_changes`. Content made in Kit's legacy editor
 * still updates immediately.
 */
export interface UpdateSequenceEmailParams {
  subject?: string | undefined;
  preview_text?: string | null | undefined;
  /** On a Starting point template, the HTML is placed inside its design. */
  content?: string | null | undefined;
  delay_value?: number | undefined;
  delay_unit?: "days" | "hours" | undefined;
  /**
   * Template for layout and styling; `null` clears it (unlike broadcasts,
   * where `null` keeps the current template). Switching to or from a Starting
   * point template without `content` applies the new design; if that would
   * discard existing content, Kit returns 409 unless `allow_content_loss` is
   * true. Legacy-editor emails cannot switch to a Starting point template
   * until opened once in Kit.
   */
  email_template_id?: number | null | undefined;
  /**
   * Confirm a template change that would discard the email's content. Only
   * applies when `email_template_id` changes without `content`; Kit defaults
   * it to `false`. Set it deliberately: do not retry a 409 with this flag
   * automatically.
   */
  allow_content_loss?: boolean | null | undefined;
  /** `true` publishes the email, including any pending draft changes. */
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
  /**
   * `true` while `content` or `email_template_id` changes wait to be
   * published; those fields show the live values until then. May be absent.
   */
  has_unpublished_changes?: boolean | undefined;
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

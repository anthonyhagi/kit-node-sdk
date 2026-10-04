import type { Pagination } from "~/common/types";
import type { ListSequencesParams } from "~/resources/sequences/types";

export interface ListSequenceEmailsParams extends ListSequencesParams {
  /** Include each email's HTML content; omitted by default. */
  include_content?: boolean | undefined;
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
  preview_text: string;
  email_address: string;
  email_template_id: number | null;
  published: boolean;
  position: number;
  delay_value: number;
  delay_unit: string;
  send_days: string[];
  /** Included when requested with include_content: true. */
  content?: string | undefined;
  /** Included when requested with include: "stats". */
  stats?: SequenceEmailStats | undefined;
}

export interface ListSequenceEmails {
  emails: SequenceEmailListItem[];
  pagination: Pagination;
}

export type GetSequenceEmailParams = Pick<ListSequenceEmailsParams, "include">;

export interface GetSequenceEmail {
  email: Omit<SequenceEmailListItem, "content"> & {
    /** Single-email reads always include HTML content. */
    content: string;
  };
}

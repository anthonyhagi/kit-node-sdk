import type { Kit } from "~/index";
import type {
  GetSequenceEmail,
  GetSequenceEmailParams,
  ListSequenceEmails,
  ListSequenceEmailsParams,
} from "./types";

export class SequenceEmailsHandler {
  constructor(private api: Kit) {}

  /**
   * Get an email's full content, timing, and publish state, with optional stats.
   *
   * @param sequenceId - The sequence containing the email.
   * @param emailId - The email to retrieve.
   * @param params - Optional stats inclusion.
   * @returns The email details, or null when the sequence or email was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/get-a-sequence-email}
   */
  public async get(
    sequenceId: number,
    emailId: number,
    params?: GetSequenceEmailParams
  ): Promise<GetSequenceEmail | null> {
    const query = new URLSearchParams({
      ...(params?.include && { include: params.include }),
    });
    return await this.api.get<GetSequenceEmail | null>(
      `/sequences/${sequenceId}/emails/${emailId}`,
      { query }
    );
  }

  /**
   * List a sequence's emails in position order, with optional content and stats.
   *
   * @param sequenceId - The sequence containing the emails.
   * @param params - Optional pagination, content, and stats parameters.
   * @returns A page of emails, or null when the sequence was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/list-sequence-emails}
   */
  public async list(
    sequenceId: number,
    params?: ListSequenceEmailsParams
  ): Promise<ListSequenceEmails | null> {
    const {
      after,
      before,
      include,
      include_content,
      include_total_count,
      per_page,
    } = params || {};
    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include && { include }),
      ...(include_content !== undefined && {
        include_content: String(include_content),
      }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page !== undefined && { per_page: String(per_page) }),
    });
    return await this.api.get<ListSequenceEmails | null>(
      `/sequences/${sequenceId}/emails`,
      { query }
    );
  }
}

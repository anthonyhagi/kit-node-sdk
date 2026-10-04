import type { Kit } from "~/index";
import type {
  CreateSequenceEmail,
  CreateSequenceEmailParams,
  GetSequenceEmail,
  GetSequenceEmailParams,
  ListSequenceEmails,
  ListSequenceEmailsParams,
  UpdateSequenceEmail,
  UpdateSequenceEmailParams,
} from "./types";

export class SequenceEmailsHandler {
  constructor(private api: Kit) {}

  /**
   * Update a sequence email, changing only the supplied fields.
   *
   * @param sequenceId - The sequence containing the email.
   * @param emailId - The email to update.
   * @param params - Content, timing, position, or publishing changes.
   * @returns The updated email, or null when the sequence or email was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/update-a-sequence-email}
   */
  public async update(
    sequenceId: number,
    emailId: number,
    params: UpdateSequenceEmailParams
  ): Promise<UpdateSequenceEmail | null> {
    return await this.api.put<UpdateSequenceEmail | null>(
      `/sequences/${sequenceId}/emails/${emailId}`,
      { body: JSON.stringify(params) }
    );
  }

  /**
   * Create a sequence email with a subject and delay; emails are drafts by default.
   *
   * @param sequenceId - The sequence containing the new email.
   * @param params - Content, timing, and optional publishing settings.
   * @returns The created email, or null when the sequence was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/create-a-sequence-email}
   */
  public async create(
    sequenceId: number,
    params: CreateSequenceEmailParams
  ): Promise<CreateSequenceEmail | null> {
    return await this.api.post<CreateSequenceEmail | null>(
      `/sequences/${sequenceId}/emails`,
      { body: JSON.stringify(params) }
    );
  }

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

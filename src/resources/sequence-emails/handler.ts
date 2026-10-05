import type { Kit, RequestOptions } from "~/index";
import type {
  CreateSequenceEmail,
  CreateSequenceEmailParams,
  GetSequenceEmail,
  GetSequenceEmailParams,
  ListSequenceEmails,
  ListSequenceEmailsParams,
  ListSequenceEmailsWithContent,
  UpdateSequenceEmail,
  UpdateSequenceEmailParams,
} from "./types";

export class SequenceEmailsHandler {
  constructor(private api: Kit) {}

  /**
   * Permanently delete an email; queued subscribers skip to the next email.
   *
   * @param sequenceId - The sequence containing the email.
   * @param emailId - The email to delete.
   * @param options - Optional request controls, including cancellation.
   * @returns An empty object on success, or null when the sequence or email was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/delete-a-sequence-email}
   */
  public async delete(
    sequenceId: number,
    emailId: number,
    options?: RequestOptions
  ): Promise<{} | null> {
    return await this.api.delete<{} | null>(
      `/sequences/${sequenceId}/emails/${emailId}`,
      { signal: options?.signal, maxRetries: options?.maxRetries }
    );
  }

  /**
   * Update a sequence email, changing only the supplied fields.
   *
   * @param sequenceId - The sequence containing the email.
   * @param emailId - The email to update.
   * @param params - Content, timing, position, or publishing changes.
   * @param options - Optional request controls, including cancellation.
   * @returns The updated email, or null when the sequence or email was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/update-a-sequence-email}
   */
  public async update(
    sequenceId: number,
    emailId: number,
    params: UpdateSequenceEmailParams,
    options?: RequestOptions
  ): Promise<UpdateSequenceEmail | null> {
    return await this.api.put<UpdateSequenceEmail | null>(
      `/sequences/${sequenceId}/emails/${emailId}`,
      {
        body: JSON.stringify(params),
        signal: options?.signal,
        maxRetries: options?.maxRetries,
      }
    );
  }

  /**
   * Create a sequence email with a subject and delay; emails are drafts by default.
   *
   * @param sequenceId - The sequence containing the new email.
   * @param params - Content, timing, and optional publishing settings.
   * @param options - Optional request controls, including cancellation.
   * @returns The created email, or null when the sequence was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/create-a-sequence-email}
   */
  public async create(
    sequenceId: number,
    params: CreateSequenceEmailParams,
    options?: RequestOptions
  ): Promise<CreateSequenceEmail | null> {
    return await this.api.post<CreateSequenceEmail | null>(
      `/sequences/${sequenceId}/emails`,
      {
        body: JSON.stringify(params),
        signal: options?.signal,
        maxRetries: options?.maxRetries,
      }
    );
  }

  /**
   * Get an email's full content, timing, and publish state, with optional stats.
   *
   * @param sequenceId - The sequence containing the email.
   * @param emailId - The email to retrieve.
   * @param params - Optional stats inclusion.
   * @param options - Optional request controls, including cancellation.
   * @returns The email details, or null when the sequence or email was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/get-a-sequence-email}
   */
  public async get(
    sequenceId: number,
    emailId: number,
    params?: GetSequenceEmailParams,
    options?: RequestOptions
  ): Promise<GetSequenceEmail | null> {
    const query = new URLSearchParams({
      ...(params?.include && { include: params.include }),
    });
    return await this.api.get<GetSequenceEmail | null>(
      `/sequences/${sequenceId}/emails/${emailId}`,
      { query, signal: options?.signal, maxRetries: options?.maxRetries }
    );
  }

  /**
   * List a sequence's emails in position order, with optional content and stats.
   *
   * @param sequenceId - The sequence containing the emails.
   * @param params - Optional pagination, content, and stats parameters.
   * @param options - Optional request controls, including cancellation.
   * @returns A page of emails, or null when the sequence was not found.
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/list-sequence-emails}
   */
  public async list(
    sequenceId: number,
    params: ListSequenceEmailsParams & { include_content: true },
    options?: RequestOptions
  ): Promise<ListSequenceEmailsWithContent | null>;
  public async list(
    sequenceId: number,
    params?: ListSequenceEmailsParams & {
      include_content?: false | null | undefined;
    },
    options?: RequestOptions
  ): Promise<ListSequenceEmails | null>;
  public async list(
    sequenceId: number,
    params?: ListSequenceEmailsParams,
    options?: RequestOptions
  ): Promise<ListSequenceEmails | ListSequenceEmailsWithContent | null>;
  public async list(
    sequenceId: number,
    params?: ListSequenceEmailsParams,
    options?: RequestOptions
  ): Promise<ListSequenceEmails | ListSequenceEmailsWithContent | null> {
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
      ...(include_content != null && {
        include_content: String(include_content),
      }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page != null && { per_page: String(per_page) }),
    });
    return await this.api.get<ListSequenceEmails | null>(
      `/sequences/${sequenceId}/emails`,
      { query, signal: options?.signal, maxRetries: options?.maxRetries }
    );
  }
}

import type { Kit, RequestOptions } from "~/index";
import { paginationQuery } from "~/utils/pagination";
import type {
  CreateSequenceEmail,
  CreateSequenceEmailParams,
  GetSequenceEmail,
  GetSequenceEmailParams,
  GetSequenceEmailWithStats,
  ListSequenceEmails,
  ListSequenceEmailsParams,
  ListSequenceEmailsWithContent,
  ListSequenceEmailsWithContentAndStats,
  ListSequenceEmailsWithStats,
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
   * @returns Resolves without a value on success.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/delete-a-sequence-email}
   */
  public async delete(
    sequenceId: number,
    emailId: number,
    options?: RequestOptions
  ): Promise<void> {
    await this.api.delete<void>(`/sequences/${sequenceId}/emails/${emailId}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Update a sequence email, changing only the supplied fields.
   *
   * @param sequenceId - The sequence containing the email.
   * @param emailId - The email to update.
   * @param params - Content, timing, position, or publishing changes.
   * @param options - Optional request controls, including cancellation.
   * @returns The updated email.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/update-a-sequence-email}
   */
  public async update(
    sequenceId: number,
    emailId: number,
    params: UpdateSequenceEmailParams,
    options?: RequestOptions
  ): Promise<UpdateSequenceEmail> {
    return await this.api.put<UpdateSequenceEmail>(
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
   * Automatic retries default to 0 because replaying an uncertain creation can
   * add another email. Request options can explicitly override this limit.
   *
   * @param sequenceId - The sequence containing the new email.
   * @param params - Content, timing, and optional publishing settings.
   * @param options - Optional request controls, including cancellation.
   * @returns The created email.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/create-a-sequence-email}
   */
  public async create(
    sequenceId: number,
    params: CreateSequenceEmailParams,
    options?: RequestOptions
  ): Promise<CreateSequenceEmail> {
    return await this.api.post<CreateSequenceEmail>(
      `/sequences/${sequenceId}/emails`,
      {
        body: JSON.stringify(params),
        signal: options?.signal,
        maxRetries: options?.maxRetries ?? 0,
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
   * @returns The email details.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/get-a-sequence-email}
   */
  public async get(
    sequenceId: number,
    emailId: number,
    params: GetSequenceEmailParams & { include: "stats" },
    options?: RequestOptions
  ): Promise<GetSequenceEmailWithStats>;
  public async get(
    sequenceId: number,
    emailId: number,
    params?: GetSequenceEmailParams & { include?: undefined },
    options?: RequestOptions
  ): Promise<GetSequenceEmail>;
  public async get(
    sequenceId: number,
    emailId: number,
    params?: GetSequenceEmailParams,
    options?: RequestOptions
  ): Promise<GetSequenceEmail | GetSequenceEmailWithStats>;
  public async get(
    sequenceId: number,
    emailId: number,
    params?: GetSequenceEmailParams,
    options?: RequestOptions
  ): Promise<GetSequenceEmail | GetSequenceEmailWithStats> {
    const query = new URLSearchParams({
      ...(params?.include && { include: params.include }),
    });
    return await this.api.get<GetSequenceEmail>(
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
   * @returns A page of emails.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/sequence-emails/list-sequence-emails}
   */
  public async list(
    sequenceId: number,
    params: ListSequenceEmailsParams & {
      include: "stats";
      include_content: true;
    },
    options?: RequestOptions
  ): Promise<ListSequenceEmailsWithContentAndStats>;
  public async list(
    sequenceId: number,
    params: ListSequenceEmailsParams & { include: "stats" },
    options?: RequestOptions
  ): Promise<ListSequenceEmailsWithStats>;
  public async list(
    sequenceId: number,
    params: ListSequenceEmailsParams & { include_content: true },
    options?: RequestOptions
  ): Promise<ListSequenceEmailsWithContent>;
  public async list(
    sequenceId: number,
    params?: ListSequenceEmailsParams & {
      include_content?: false | null | undefined;
    },
    options?: RequestOptions
  ): Promise<ListSequenceEmails>;
  public async list(
    sequenceId: number,
    params?: ListSequenceEmailsParams,
    options?: RequestOptions
  ): Promise<ListSequenceEmails | ListSequenceEmailsWithContent>;
  public async list(
    sequenceId: number,
    params?: ListSequenceEmailsParams,
    options?: RequestOptions
  ): Promise<ListSequenceEmails | ListSequenceEmailsWithContent> {
    const { include, include_content } = params || {};
    const query = new URLSearchParams({
      ...paginationQuery(params, { includeZeroPageSize: true }),
      ...(include && { include }),
      ...(include_content != null && {
        include_content: String(include_content),
      }),
    });
    return await this.api.get<ListSequenceEmails>(
      `/sequences/${sequenceId}/emails`,
      { query, signal: options?.signal, maxRetries: options?.maxRetries }
    );
  }
}

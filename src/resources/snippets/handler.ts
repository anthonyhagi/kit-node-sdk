import type { Kit, RequestOptions } from "~/index";
import { paginationQuery } from "~/utils/pagination";
import type {
  CreateSnippet,
  CreateSnippetParams,
  GetSnippet,
  ListSnippets,
  ListSnippetsParams,
  ListSnippetsWithContent,
  UpdateSnippet,
  UpdateSnippetParams,
} from "./types";

export class SnippetsHandler {
  constructor(private api: Kit) {}

  /**
   * Rename, edit, archive, or restore a snippet, preserving omitted fields.
   *
   * @param id - The snippet to update.
   * @param params - Changes matching the existing inline or block snippet type.
   * @param options - Optional request controls, including cancellation.
   * @returns The updated snippet.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/snippets/update-a-snippet}
   */
  public async update(
    id: number,
    params: UpdateSnippetParams,
    options?: RequestOptions
  ): Promise<UpdateSnippet> {
    return await this.api.put<UpdateSnippet>(`/snippets/${id}`, {
      body: JSON.stringify(params),
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Create reusable inline text or block HTML content.
   *
   * @param params - The name, snippet type, and corresponding content fields.
   * @param options - Optional request controls, including cancellation.
   * @returns The created snippet, including its Liquid key and document.
   * @see {@link https://developers.kit.com/api-reference/snippets/create-a-snippet}
   */
  public async create(
    params: CreateSnippetParams,
    options?: RequestOptions
  ): Promise<CreateSnippet> {
    return await this.api.post<CreateSnippet>("/snippets", {
      body: JSON.stringify(params),
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Get a snippet's full content and document without an inclusion flag.
   *
   * @param id - The snippet to retrieve.
   * @param options - Optional request controls, including cancellation.
   * @returns The snippet details.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/snippets/get-a-snippet}
   */
  public async get(id: number, options?: RequestOptions): Promise<GetSnippet> {
    return await this.api.get<GetSnippet>(`/snippets/${id}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * List reusable email snippets, with optional content and document fields.
   *
   * @param params - Optional pagination, snippet type, archive, and content filters.
   * @param options - Optional request controls, including cancellation.
   * @returns A page of snippets.
   * @see {@link https://developers.kit.com/api-reference/snippets/list-snippets}
   */
  public async list(
    params: ListSnippetsParams & { include_content: true },
    options?: RequestOptions
  ): Promise<ListSnippetsWithContent>;
  public async list(
    params?: ListSnippetsParams & { include_content?: false | undefined },
    options?: RequestOptions
  ): Promise<ListSnippets>;
  public async list(
    params?: ListSnippetsParams,
    options?: RequestOptions
  ): Promise<ListSnippets | ListSnippetsWithContent>;
  public async list(
    params?: ListSnippetsParams,
    options?: RequestOptions
  ): Promise<ListSnippets | ListSnippetsWithContent> {
    const { archived, snippet_type, include_content } = params || {};
    const query = new URLSearchParams({
      ...paginationQuery(params, { includeZeroPageSize: true }),
      ...(archived != null && { archived: String(archived) }),
      ...(snippet_type && { snippet_type }),
      ...(include_content !== undefined && {
        include_content: String(include_content),
      }),
    });
    return await this.api.get<ListSnippets>("/snippets", {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

import type { Kit } from "~/index";
import type {
  CreateSnippet,
  CreateSnippetParams,
  GetSnippet,
  ListSnippets,
  ListSnippetsParams,
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
   * @returns The updated snippet, or null when the snippet was not found.
   * @see {@link https://developers.kit.com/api-reference/snippets/update-a-snippet}
   */
  public async update(
    id: number,
    params: UpdateSnippetParams
  ): Promise<UpdateSnippet | null> {
    return await this.api.put<UpdateSnippet | null>(`/snippets/${id}`, {
      body: JSON.stringify(params),
    });
  }

  /**
   * Create reusable inline text or block HTML content.
   *
   * @param params - The name, snippet type, and corresponding content fields.
   * @returns The created snippet, including its Liquid key and document.
   * @see {@link https://developers.kit.com/api-reference/snippets/create-a-snippet}
   */
  public async create(params: CreateSnippetParams): Promise<CreateSnippet> {
    return await this.api.post<CreateSnippet>("/snippets", {
      body: JSON.stringify(params),
    });
  }

  /**
   * Get a snippet's full content and document without an inclusion flag.
   *
   * @param id - The snippet to retrieve.
   * @returns The snippet details, or null when the snippet was not found.
   * @see {@link https://developers.kit.com/api-reference/snippets/get-a-snippet}
   */
  public async get(id: number): Promise<GetSnippet | null> {
    return await this.api.get<GetSnippet | null>(`/snippets/${id}`);
  }

  /**
   * List reusable email snippets, with optional content and document fields.
   *
   * @param params - Optional pagination, snippet type, archive, and content filters.
   * @returns A page of snippets.
   * @see {@link https://developers.kit.com/api-reference/snippets/list-snippets}
   */
  public async list(params?: ListSnippetsParams): Promise<ListSnippets> {
    const {
      after,
      before,
      archived,
      snippet_type,
      include_content,
      include_total_count,
      per_page,
    } = params || {};
    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(archived != null && { archived: String(archived) }),
      ...(snippet_type && { snippet_type }),
      ...(include_content !== undefined && {
        include_content: String(include_content),
      }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page != null && { per_page: String(per_page) }),
    });
    return await this.api.get<ListSnippets>("/snippets", { query });
  }
}

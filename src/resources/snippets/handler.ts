import type { Kit } from "~/index";
import type { GetSnippet, ListSnippets, ListSnippetsParams } from "./types";

export class SnippetsHandler {
  constructor(private api: Kit) {}

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
      ...(archived !== undefined && { archived: String(archived) }),
      ...(snippet_type && { snippet_type }),
      ...(include_content !== undefined && {
        include_content: String(include_content),
      }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page !== undefined && { per_page: String(per_page) }),
    });
    return await this.api.get<ListSnippets>("/snippets", { query });
  }
}

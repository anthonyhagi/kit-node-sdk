import type { Kit, RequestOptions } from "~/index";
import { paginationQuery } from "~/utils/pagination";
import type { GetApp, ListApps, ListAppsParams } from "./types";

export class AppsHandler {
  constructor(private api: Kit) {}

  /**
   * List the Kit App Store apps the account can see: every listed app, plus
   * the account's own apps in any status (marked `owned`). Built-in
   * integrations are not apps, so `ai_connectors` alone currently returns none.
   *
   * Without `query`, apps are ordered by install count and `total_count` is
   * exact. With `query`, results are in relevance order and use search cursors.
   * Follow cursors with the same `query` and `category`.
   *
   * @param params - Optional category, search, and pagination parameters.
   * @param options - Optional request controls, including cancellation.
   * @returns A page of compact app listings.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response, including
   * 422 for invalid filters or mixed cursors and 503 when search is unavailable.
   *
   * @see {@link https://developers.kit.com/api-reference/apps/list-apps}
   */
  public async list(
    params?: ListAppsParams,
    options?: RequestOptions
  ): Promise<ListApps> {
    const { category, query } = params || {};
    const categories = Array.isArray(category) ? category.join(",") : category;
    const search = new URLSearchParams({
      ...paginationQuery(params, { includeZeroPageSize: true }),
      ...(categories && { category: categories }),
      ...(query != null && { query }),
    });
    return await this.api.get<ListApps>("/apps", {
      query: search,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Get one app with its description, capabilities, links, screenshots, and
   * install URL. Installing is a browser step: open `install_url` yourself;
   * the SDK never follows it.
   *
   * @param id - The app's id, from `list()`.
   * @param options - Optional request controls, including cancellation.
   * @returns The full app listing.
   * @throws {NotFoundError} If the app does not exist, was deleted, or is
   * another developer's app that is unpublished, unlisted, disabled or blocked.
   *
   * @see {@link https://developers.kit.com/api-reference/apps/get-an-app}
   */
  public async get(id: number, options?: RequestOptions): Promise<GetApp> {
    return await this.api.get<GetApp>(`/apps/${id}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

import type { Kit, RequestOptions } from "~/index";
import type { ListEmailTemplates, ListEmailTemplatesParams } from "./types";

export class EmailTemplatesHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Get a paginated list of all Email Templates.
   *
   * @param params - Optional parameters to filter by.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/email-templates/list-email-templates}
   *
   * @returns The paginated list of Email Templates.
   */
  public async list(
    params?: ListEmailTemplatesParams,
    options?: RequestOptions
  ): Promise<ListEmailTemplates> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    const url = "/email_templates";

    return await this.api.get<ListEmailTemplates>(url, {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

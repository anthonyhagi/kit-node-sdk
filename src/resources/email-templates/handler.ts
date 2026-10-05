import type { Kit, RequestOptions } from "~/index";
import { paginationQuery } from "~/utils/pagination";
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
    const query = new URLSearchParams(paginationQuery(params));

    const url = "/email_templates";

    return await this.api.get<ListEmailTemplates>(url, {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

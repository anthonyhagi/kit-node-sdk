import type { Pagination } from "~/common/types";

export interface ListEmailTemplatesParams {
  /**
   * Pass in the string from the previous request to move
   * the cursor. This can be found in the following field:
   *
   * @example after: pagination.end_cursor
   */
  after?: string | null | undefined;

  /**
   * Pass in the string from the previous request to move
   * the cursor. This can be found in the following field:
   *
   * @example before: pagination.start_cursor
   */
  before?: string | null | undefined;

  /**
   * To include the total count of records in the response,
   * use `true`. For large collections, expect a slightly
   * slower response.
   *
   * @example include_total_count: true
   */
  include_total_count?: boolean | undefined;

  /**
   * Number of results per page. Default 500, maximum 1000.
   *
   * @example per_page: 500
   */
  per_page?: number | null | undefined;
}

export interface ListEmailTemplates {
  email_templates: {
    id: number;
    name: string;
    is_default: boolean;
    category: string;
  }[];
  pagination: Pagination;
}

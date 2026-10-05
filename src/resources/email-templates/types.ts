import type { Pagination, PaginationParams } from "~/common/types";

export interface ListEmailTemplatesParams extends PaginationParams {}

/** Email template metadata returned by template lists. */
export interface EmailTemplate {
  id: number;
  name: string;
  is_default: boolean;
  category: string;
}

export interface ListEmailTemplates {
  email_templates: EmailTemplate[];
  pagination: Pagination;
}

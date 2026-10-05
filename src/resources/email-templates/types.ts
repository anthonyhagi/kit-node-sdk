import type { Pagination, PaginationParams } from "~/common/types";

export interface ListEmailTemplatesParams extends PaginationParams {}

export interface ListEmailTemplates {
  email_templates: {
    id: number;
    name: string;
    is_default: boolean;
    category: string;
  }[];
  pagination: Pagination;
}

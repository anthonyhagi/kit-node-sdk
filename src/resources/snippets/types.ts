import type { Pagination } from "~/common/types";

export type SnippetType = "inline" | "block";

/** Inline snippets use text content; block snippets use an HTML document. */
export type CreateSnippetParams =
  | {
      name: string;
      snippet_type: "inline";
      content: string;
      document_attributes?: never;
    }
  | {
      name: string;
      snippet_type: "block";
      document_attributes: { value_html: string };
      content?: never;
    };

export interface CreateSnippet {
  snippet: Omit<GetSnippet["snippet"], "document"> & {
    document: Omit<SnippetDocument, "value_html"> & {
      /** Inline snippets can return a document without HTML. */
      value_html: string | null;
    };
  };
}

/** Omitted fields are preserved; the body must match the existing snippet type. */
export type UpdateSnippetParams = {
  name?: string | undefined;
  archived?: boolean | undefined;
} & (
  | {
      /** If supplied, must match the existing type. */
      snippet_type?: "inline" | undefined;
      content?: string | undefined;
      document_attributes?: never;
    }
  | {
      /** If supplied, must match the existing type. */
      snippet_type?: "block" | undefined;
      document_attributes?: { value_html: string } | undefined;
      content?: never;
    }
);

export type UpdateSnippet = GetSnippet;

export interface ListSnippetsParams {
  /** Cursor from the previous page's end_cursor. */
  after?: string | null | undefined;
  /** Cursor from the next page's start_cursor. */
  before?: string | null | undefined;
  /** Return only archived snippets when true; defaults to false. */
  archived?: boolean | null | undefined;
  snippet_type?: SnippetType | null | undefined;
  /** Include content and document fields; omitted by default. */
  include_content?: boolean | undefined;
  include_total_count?: boolean | undefined;
  /** Number of results per page. Default 500, maximum 1000. */
  per_page?: number | null | undefined;
}

export interface SnippetDocument {
  id: number;
  /** Kit leaves this nullable document value's structure unspecified. */
  value: unknown;
  value_html: string;
  /** Kit leaves this nullable document value's structure unspecified. */
  value_plain: unknown;
  version: number;
}

export interface SnippetListItem {
  id: number;
  name: string;
  snippet_type: string;
  archived: boolean;
  /** Identifier used in Liquid as {{ snippet.key }}. */
  key: string;
  created_at: string;
  updated_at: string;
  /** Included when requested with include_content: true. */
  content?: string | undefined;
  /** Included when requested with include_content: true. */
  document?: SnippetDocument | undefined;
}

export interface ListSnippets {
  snippets: SnippetListItem[];
  pagination: Pagination;
}

export interface GetSnippet {
  snippet: Omit<SnippetListItem, "content" | "document"> & {
    /** Single-snippet reads always include content and document. */
    content: string;
    document: SnippetDocument;
  };
}

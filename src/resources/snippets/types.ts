import type { Pagination, PaginationParams } from "~/common/types";

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
  snippet: Omit<Snippet, "document"> & {
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

export interface ListSnippetsParams extends PaginationParams {
  /** Return only archived snippets when true; defaults to false. */
  archived?: boolean | null | undefined;
  snippet_type?: SnippetType | null | undefined;
  /** Include content and document fields; omitted by default. */
  include_content?: boolean | undefined;
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

/** Snippet lists requested with include_content: true include both body fields. */
export interface ListSnippetsWithContent extends Omit<
  ListSnippets,
  "snippets"
> {
  snippets: Snippet[];
}

/** Full snippet record returned by reads, updates, and lists requesting content. */
export type Snippet = Omit<SnippetListItem, "content" | "document"> & {
  /** Full reads always include content and document. */
  content: string;
  document: SnippetDocument;
};

export interface GetSnippet {
  snippet: Snippet;
}

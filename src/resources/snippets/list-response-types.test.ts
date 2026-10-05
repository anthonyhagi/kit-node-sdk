import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type ListSnippets,
  type ListSnippetsParams,
  type ListSnippetsWithContent,
  type SnippetDocument,
} from "~/index";

const metadata = {
  id: 5,
  name: "Greeting",
  snippet_type: "inline",
  archived: false,
  key: "greeting",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
const pagination = {
  has_previous_page: false,
  has_next_page: false,
  start_cursor: null,
  end_cursor: null,
  per_page: 500,
};

describe("snippet list response inference", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each(["inline", "block"] as const)(
    "requires content and document when requested for %s snippets",
    async (snippet_type) => {
      const response = {
        snippets: [
          {
            ...metadata,
            snippet_type,
            content: "",
            document: {
              id: 9,
              value: null,
              value_html: "",
              value_plain: null,
              version: 1,
            },
          },
        ],
        pagination,
      } satisfies ListSnippetsWithContent;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const controller = new AbortController();
      const result = await kit.snippets.list(
        { include_content: true, snippet_type, after: null, per_page: 25 },
        { signal: controller.signal }
      );
      expectTypeOf(result).toEqualTypeOf<ListSnippetsWithContent>();
      expectTypeOf(result).toExtend<ListSnippets>();
      expectTypeOf<
        (typeof result)["snippets"][number]["content"]
      >().toEqualTypeOf<string>();
      expectTypeOf(
        result.snippets[0]!.document
      ).toEqualTypeOf<SnippetDocument>();
      expect(result).toEqual(response);
      expect(
        Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
      ).toEqual({
        include_content: "true",
        snippet_type,
        per_page: "25",
      });
      expect(fetchMock.mock.calls[0]![1]?.signal).toBe(controller.signal);
      expectTypeOf<{
        snippets: (typeof metadata)[];
        pagination: typeof pagination;
      }>().not.toExtend<ListSnippetsWithContent>();
    }
  );

  it.each([
    undefined,
    {},
    { include_content: false },
    { include_content: undefined },
  ] as const)(
    "preserves the existing metadata response type for %j",
    async (params) => {
      const response = {
        snippets: [metadata],
        pagination,
      } satisfies ListSnippets;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const result = await kit.snippets.list(params);
      expectTypeOf(result).toEqualTypeOf<ListSnippets>();
      expectTypeOf<
        (typeof result)["snippets"][number]["content"]
      >().toEqualTypeOf<string | undefined>();
      expectTypeOf<
        (typeof result)["snippets"][number]["document"]
      >().toEqualTypeOf<SnippetDocument | undefined>();
      expect(result).toEqual(response);
      expect(result.snippets[0]).not.toHaveProperty("content");
      expect(result.snippets[0]).not.toHaveProperty("document");
    }
  );

  it.each([true, false])(
    "keeps broad parameters safe with include_content: %s",
    async (include_content) => {
      const params: ListSnippetsParams = { include_content };
      fetchMock.mockResponseOnce(JSON.stringify({ snippets: [], pagination }));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const result = await kit.snippets.list(params);
      expectTypeOf(result).toEqualTypeOf<
        ListSnippets | ListSnippetsWithContent
      >();
      expectTypeOf(result).toExtend<ListSnippets>();
      expectTypeOf<
        (typeof result)["snippets"][number]["content"]
      >().toEqualTypeOf<string | undefined>();
      expectTypeOf<
        (typeof result)["snippets"][number]["document"]
      >().toEqualTypeOf<SnippetDocument | undefined>();
      expect(result.snippets).toEqual([]);
    }
  );
});

import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type ListSnippets,
  type ListSnippetsParams,
  type SnippetDocument,
  type SnippetType,
} from "~/index";

const snippet = {
  id: 5,
  name: "Welcome message",
  snippet_type: "inline",
  archived: false,
  key: "welcome-message",
  created_at: "2023-02-17T11:43:55Z",
  updated_at: "2023-02-17T11:43:55Z",
};
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 500,
};

function request(query = {}) {
  expect(fetchMock.requests()).toHaveLength(1);
  const req = fetchMock.requests()[0]!;
  const url = new URL(req.url);
  expect(req.method).toBe("GET");
  expect(url.origin).toBe("https://api.kit.com");
  expect(url.pathname).toBe("/v4/snippets");
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("snippet list requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists metadata with no optional query or request body", async () => {
    const response = { snippets: [snippet], pagination } satisfies ListSnippets;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.snippets.list();
    expectTypeOf(result).toEqualTypeOf<ListSnippets>();
    expectTypeOf(result.snippets[0]!.content).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(result.snippets[0]!.document).toEqualTypeOf<
      SnippetDocument | undefined
    >();
    expectTypeOf(result.pagination.total_count).toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<{
      snippet_type: "other";
    }>().not.toExtend<ListSnippetsParams>();
    expect(result).toEqual(response);
    expect(result.snippets[0]).not.toHaveProperty("content");
    expect(result.snippets[0]).not.toHaveProperty("document");
    const req = request();
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.text()).toBe("");
  });

  it.each(["inline", "block"] satisfies SnippetType[])(
    "requests content and document for %s snippets",
    async (snippet_type) => {
      const document = {
        id: 292,
        value: null,
        value_html: "<p>Hello</p>",
        value_plain: null,
        version: 1,
      } satisfies SnippetDocument;
      const response = {
        snippets: [
          {
            ...snippet,
            snippet_type,
            content: "Hello {{ subscriber.first_name }}",
            document,
          },
        ],
        pagination,
      } satisfies ListSnippets;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.snippets.list({ snippet_type, include_content: true })
      ).toEqual(response);
      request({ snippet_type, include_content: "true" });
    }
  );

  it.each(["after", "before"] as const)(
    "combines %s pagination with archive and content filters and counts",
    async (cursor) => {
      const response = {
        snippets: [{ ...snippet, archived: true }],
        pagination: { ...pagination, total_count: 42, per_page: 25 },
      } satisfies ListSnippets;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.snippets.list({
          [cursor]: "next+/=",
          archived: true,
          snippet_type: "block",
          include_content: true,
          include_total_count: true,
          per_page: 25,
        })
      ).toEqual(response);
      request({
        [cursor]: "next+/=",
        archived: "true",
        snippet_type: "block",
        include_content: "true",
        include_total_count: "true",
        per_page: "25",
      });
    }
  );

  it("preserves false flags and omits undefined values", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ snippets: [], pagination }));
    await kit.snippets.list({
      archived: false,
      include_content: false,
      include_total_count: false,
      snippet_type: undefined,
      per_page: undefined,
    });
    request({
      archived: "false",
      include_content: "false",
      include_total_count: "false",
    });
  });

  it("follows a returned cursor while preserving list options", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ snippets: [snippet], pagination })
    );
    const first = await kit.snippets.list({
      snippet_type: "inline",
      per_page: 25,
    });
    fetchMock.mockResponseOnce(
      JSON.stringify({
        snippets: [],
        pagination: {
          ...pagination,
          has_next_page: false,
          start_cursor: null,
          end_cursor: null,
        },
      })
    );
    const last = await kit.snippets.list({
      after: first.pagination.end_cursor!,
      snippet_type: "inline",
      per_page: 25,
    });
    expect(last.snippets).toEqual([]);
    expect(last.pagination.end_cursor).toBeNull();
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[1]!.url).searchParams)
    ).toEqual({
      after: "next+/=",
      snippet_type: "inline",
      per_page: "25",
    });
  });

  it("preserves an empty page with null cursors and a zero total count", async () => {
    const response = {
      snippets: [],
      pagination: {
        ...pagination,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
        total_count: 0,
      },
    } satisfies ListSnippets;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.snippets.list({ include_total_count: true })).toEqual(
      response
    );
    request({ include_total_count: "true" });
  });

  it.each([1, 1000])("sends a page size of %s", async (per_page) => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ snippets: [], pagination: { ...pagination, per_page } })
    );
    await kit.snippets.list({ per_page });
    request({ per_page: String(per_page) });
  });

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(kit.snippets.list()).rejects.toThrow("Authentication failed");
    request();
  });
});

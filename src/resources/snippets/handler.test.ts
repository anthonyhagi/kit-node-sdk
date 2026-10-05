import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type CreateSnippet,
  type CreateSnippetParams,
  type GetSnippet,
  type ListSnippets,
  type ListSnippetsParams,
  type Snippet,
  type SnippetDocument,
  type SnippetType,
  type UpdateSnippet,
  type UpdateSnippetParams,
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

  it.each([
    {
      after: null,
      before: null,
      archived: null,
      per_page: null,
      snippet_type: null,
    },
    {
      after: undefined,
      before: undefined,
      archived: undefined,
      per_page: undefined,
      snippet_type: undefined,
    },
  ] satisfies ListSnippetsParams[])(
    "omits nullable and undefined list parameters: %j",
    async (params) => {
      fetchMock.mockResponseOnce(JSON.stringify({ snippets: [], pagination }));
      await kit.snippets.list({
        ...params,
        include_content: false,
        include_total_count: false,
      });
      request({ include_content: "false", include_total_count: "false" });
    }
  );

  it("preserves explicit false alongside nullable filters", async () => {
    const params = {
      after: null,
      before: null,
      archived: false,
      snippet_type: null,
      per_page: null,
    } satisfies ListSnippetsParams;
    fetchMock.mockResponseOnce(JSON.stringify({ snippets: [], pagination }));
    await kit.snippets.list(params);
    request({ archived: "false" });
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

describe("snippet get requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it.each(["inline", "block"] satisfies SnippetType[])(
    "retrieves full %s content and document without an inclusion flag",
    async (snippet_type) => {
      const response = {
        snippet: {
          ...snippet,
          snippet_type,
          content: "Hello {{ subscriber.first_name }}",
          document: {
            id: 311,
            value: null,
            value_html: "<p>Hello</p>",
            value_plain: null,
            version: 1,
          },
        },
      } satisfies GetSnippet;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.snippets.get(5);
      expectTypeOf(result).toEqualTypeOf<GetSnippet | null>();
      expectTypeOf(result!.snippet).toEqualTypeOf<Snippet>();
      expectTypeOf(result!.snippet.content).toEqualTypeOf<string>();
      expectTypeOf(result!.snippet.document).toEqualTypeOf<SnippetDocument>();
      expectTypeOf<typeof snippet>().not.toExtend<GetSnippet["snippet"]>();
      expect(result).toEqual(response);
      expect(fetchMock.requests()).toHaveLength(1);
      const req = fetchMock.requests()[0]!;
      expect(req.method).toBe("GET");
      expect(req.url).toBe("https://api.kit.com/v4/snippets/5");
      expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
      expect(await req.text()).toBe("");
    }
  );

  it("preserves archived status, empty content, and opaque document values", async () => {
    const response = {
      snippet: {
        ...snippet,
        archived: true,
        content: "",
        document: {
          id: 311,
          value: { blocks: [] },
          value_html: "",
          value_plain: "",
          version: 2,
        },
      },
    } satisfies GetSnippet;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.snippets.get(5)).toEqual(response);
  });

  it("returns null for a missing snippet", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(await kit.snippets.get(404)).toBeNull();
    expect(fetchMock.requests()[0]!.url).toBe(
      "https://api.kit.com/v4/snippets/404"
    );
  });

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(kit.snippets.get(5)).rejects.toThrow("Authentication failed");
    expect(fetchMock.requests()).toHaveLength(1);
  });
});

describe("snippet update requests through Kit", () => {
  let kit: Kit;
  const fullSnippet = {
    ...snippet,
    content: "Hello {{ subscriber.first_name }}",
    document: {
      id: 311,
      value: null,
      value_html: "Hello",
      value_plain: null,
      version: 1,
    },
  };
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("renames without sending a type or changing omitted content fields", async () => {
    const params = {
      name: "Updated name",
      archived: undefined,
    } satisfies UpdateSnippetParams;
    const response = {
      snippet: { ...fullSnippet, name: "Updated name" },
    } satisfies UpdateSnippet;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.snippets.update(5, params);
    expectTypeOf(result).toEqualTypeOf<UpdateSnippet | null>();
    expectTypeOf(result!.snippet).toEqualTypeOf<Snippet>();
    expectTypeOf(result!.snippet.content).toEqualTypeOf<string>();
    expectTypeOf(result!.snippet.document).toEqualTypeOf<SnippetDocument>();
    expect(result).toEqual(response);
    expect(result!.snippet.key).toBe(snippet.key);
    expect(fetchMock.requests()).toHaveLength(1);
    const req = fetchMock.requests()[0]!;
    expect(req.method).toBe("PUT");
    expect(req.url).toBe("https://api.kit.com/v4/snippets/5");
    expect(await req.json()).toEqual({ name: "Updated name" });
  });

  it.each([true, false])(
    "preserves an archive-only update with archived: %s",
    async (archived) => {
      const response = {
        snippet: { ...fullSnippet, archived },
      } satisfies UpdateSnippet;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(await kit.snippets.update(5, { archived })).toEqual(response);
      expect(await fetchMock.requests()[0]!.json()).toEqual({ archived });
    }
  );

  it.each(["", "Hello {{ subscriber.first_name }}!"])(
    "updates inline text %j",
    async (content) => {
      const params = {
        snippet_type: "inline",
        content,
      } satisfies UpdateSnippetParams;
      const response = {
        snippet: { ...fullSnippet, content },
      } satisfies UpdateSnippet;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(await kit.snippets.update(5, params)).toEqual(response);
      expect(await fetchMock.requests()[0]!.json()).toEqual(params);
    }
  );

  it("updates block HTML without requiring snippet_type", async () => {
    const params = {
      document_attributes: { value_html: "<p>Updated</p>" },
    } satisfies UpdateSnippetParams;
    const response = {
      snippet: {
        ...fullSnippet,
        snippet_type: "block",
        document: {
          ...fullSnippet.document,
          value_html: params.document_attributes.value_html,
          version: 2,
        },
      },
    } satisfies UpdateSnippet;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.snippets.update(5, params)).toEqual(response);
    expect(await fetchMock.requests()[0]!.json()).toEqual(params);
  });

  it("accepts an explicit matching block type and combined metadata changes", async () => {
    const params = {
      name: "Footer",
      archived: false,
      snippet_type: "block",
      document_attributes: { value_html: "" },
    } satisfies UpdateSnippetParams;
    const response = {
      snippet: {
        ...fullSnippet,
        name: "Footer",
        archived: false,
        snippet_type: "block",
        document: { ...fullSnippet.document, value_html: "" },
      },
    } satisfies UpdateSnippet;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.snippets.update(5, params)).toEqual(response);
    expect(await fetchMock.requests()[0]!.json()).toEqual(params);
  });

  it("allows empty updates without adding defaults", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ snippet: fullSnippet }));
    await kit.snippets.update(5, {});
    expect(await fetchMock.requests()[0]!.json()).toEqual({});
  });

  it("excludes mixed or mismatched body fields from the request type", () => {
    expectTypeOf<{
      content: string;
      document_attributes: { value_html: string };
    }>().not.toExtend<UpdateSnippetParams>();
    expectTypeOf<{
      snippet_type: "block";
      content: string;
    }>().not.toExtend<UpdateSnippetParams>();
    expectTypeOf<{
      snippet_type: "inline";
      document_attributes: { value_html: string };
    }>().not.toExtend<UpdateSnippetParams>();
    expectTypeOf<{
      document_attributes: {};
    }>().not.toExtend<UpdateSnippetParams>();
  });

  it("returns null for missing snippets", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(await kit.snippets.update(404, { name: "Renamed" })).toBeNull();
    expect(fetchMock.requests()[0]!.url).toBe(
      "https://api.kit.com/v4/snippets/404"
    );
  });

  it("surfaces validation errors for changes to the existing type", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["snippet_type cannot be changed"] }),
      { status: 422 }
    );
    const params = {
      snippet_type: "block",
      document_attributes: { value_html: "<p>Updated</p>" },
    } satisfies UpdateSnippetParams;
    await expect(kit.snippets.update(5, params)).rejects.toThrow(
      "snippet_type cannot be changed"
    );
    expect(await fetchMock.requests()[0]!.json()).toEqual(params);
  });

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(kit.snippets.update(5, { archived: true })).rejects.toThrow(
      "Authentication failed"
    );
  });
});

describe("snippet create requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("creates inline Liquid content and preserves a document with null HTML", async () => {
    const params = {
      name: "Welcome message",
      snippet_type: "inline",
      content: "Hello {{ subscriber.first_name }}",
    } satisfies CreateSnippetParams;
    const response = {
      snippet: {
        ...snippet,
        content: params.content,
        document: {
          id: 318,
          value: null,
          value_html: null,
          value_plain: null,
          version: 1,
        },
      },
    } satisfies CreateSnippet;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    const result = await kit.snippets.create(params);
    expectTypeOf(result).toEqualTypeOf<CreateSnippet>();
    expectTypeOf(result.snippet).toEqualTypeOf<
      Omit<Snippet, "document"> & {
        document: Omit<SnippetDocument, "value_html"> & {
          value_html: string | null;
        };
      }
    >();
    expectTypeOf(result.snippet.content).toEqualTypeOf<string>();
    expectTypeOf(result.snippet.document.value_html).toEqualTypeOf<
      string | null
    >();
    expect(result).toEqual(response);
    expect(fetchMock.requests()).toHaveLength(1);
    const req = fetchMock.requests()[0]!;
    expect(req.url).toBe("https://api.kit.com/v4/snippets");
    expect(req.method).toBe("POST");
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.json()).toEqual(params);
  });

  it("creates block HTML using nested document attributes", async () => {
    const params = {
      name: "Footer",
      snippet_type: "block",
      document_attributes: {
        value_html: "<p>Thanks, {{ subscriber.first_name }}!</p>",
      },
    } satisfies CreateSnippetParams;
    const response = {
      snippet: {
        ...snippet,
        name: "Footer",
        key: "footer",
        snippet_type: "block",
        content: "",
        document: {
          id: 319,
          value: { blocks: [] },
          value_html: params.document_attributes.value_html,
          value_plain: null,
          version: 1,
        },
      },
    } satisfies CreateSnippet;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    expect(await kit.snippets.create(params)).toEqual(response);
    const body = await fetchMock.requests()[0]!.json();
    expect(body).toEqual(params);
    expect(body).not.toHaveProperty("content");
  });

  it("requires the content field matching the snippet type", () => {
    expectTypeOf<{
      name: string;
      snippet_type: "inline";
    }>().not.toExtend<CreateSnippetParams>();
    expectTypeOf<{
      name: string;
      snippet_type: "block";
      content: string;
    }>().not.toExtend<CreateSnippetParams>();
    expectTypeOf<{
      name: string;
      snippet_type: "inline";
      document_attributes: { value_html: string };
    }>().not.toExtend<CreateSnippetParams>();
    expectTypeOf<{
      name: string;
      snippet_type: "block";
      document_attributes: {};
    }>().not.toExtend<CreateSnippetParams>();
    expectTypeOf<{
      name: string;
      snippet_type: "inline";
      content: string;
      document_attributes: { value_html: string };
    }>().not.toExtend<CreateSnippetParams>();
  });

  it.each(["name can't be blank", "Circular snippet reference"])(
    "surfaces API validation errors: %s",
    async (message) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: [message] }), {
        status: 422,
      });
      const params = {
        name: "",
        snippet_type: "inline",
        content: "{{ snippet.welcome-message }}",
      } satisfies CreateSnippetParams;
      await expect(kit.snippets.create(params)).rejects.toThrow(message);
      expect(await fetchMock.requests()[0]!.json()).toEqual(params);
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(
      kit.snippets.create({
        name: "Welcome",
        snippet_type: "inline",
        content: "Hello",
      })
    ).rejects.toThrow("Authentication failed");
  });
});

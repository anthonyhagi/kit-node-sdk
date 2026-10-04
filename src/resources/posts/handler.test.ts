import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { Kit, type ListPosts, type PostListItem } from "~/index";

const draft = {
  id: 5,
  publication_id: 20,
  created_at: "2026-09-29T09:51:41Z",
  title: "Draft Post",
  slug: null,
  description: null,
  meta_description: null,
  status: "draft",
  published_at: null,
  sent_at: null,
  thumbnail_alt: null,
  thumbnail_url: null,
  is_paid: false,
  public_url: null,
} satisfies PostListItem;
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
  expect(url.pathname).toBe("/v4/posts");
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("post list requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists draft metadata without injecting content, product, or query defaults", async () => {
    const response = { posts: [draft], pagination } satisfies ListPosts;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.posts.list();
    expectTypeOf(result).toEqualTypeOf<ListPosts>();
    expectTypeOf(result.posts[0]!.content).toEqualTypeOf<string | undefined>();
    expectTypeOf(result.posts[0]!.product_id).toEqualTypeOf<
      number | null | undefined
    >();
    expectTypeOf(result.posts[0]!.public_url).toEqualTypeOf<string | null>();
    expectTypeOf(result.pagination.total_count).toEqualTypeOf<
      number | undefined
    >();
    expect(result).toEqual(response);
    expect(result.posts[0]).not.toHaveProperty("content");
    expect(result.posts[0]).not.toHaveProperty("product_id");
    const req = request();
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.text()).toBe("");
  });

  it("preserves published and paid metadata with optional HTML content", async () => {
    const post = {
      ...draft,
      title: "Newsletter",
      status: "published",
      slug: "newsletter",
      description: "Post description",
      meta_description: "SEO description",
      published_at: "2026-09-27T09:51:41Z",
      sent_at: "2026-09-29T09:51:41Z",
      thumbnail_alt: "Cover",
      thumbnail_url: "https://example.com/cover.png",
      public_url: "https://example.kit.com/posts/newsletter",
      is_paid: true,
      product_id: 1,
      content: "<p>Newsletter content</p>",
    } satisfies PostListItem;
    const response = {
      posts: [post, { ...draft, product_id: null, content: "" }],
      pagination,
    } satisfies ListPosts;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.posts.list({ include_content: true })).toEqual(response);
    request({ include_content: "true" });
  });

  it.each(["after", "before"] as const)(
    "combines %s pagination with content and counts",
    async (cursor) => {
      const response = {
        posts: [draft],
        pagination: { ...pagination, per_page: 25, total_count: 42 },
      } satisfies ListPosts;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.posts.list({
          [cursor]: "next+/=",
          include_content: true,
          include_total_count: true,
          per_page: 25,
        })
      ).toEqual(response);
      request({
        [cursor]: "next+/=",
        include_content: "true",
        include_total_count: "true",
        per_page: "25",
      });
    }
  );

  it("preserves false inclusion flags and omits undefined fields", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ posts: [], pagination }));
    await kit.posts.list({
      include_content: false,
      include_total_count: false,
      per_page: undefined,
    });
    request({ include_content: "false", include_total_count: "false" });
  });

  it("follows a returned cursor with the requested content settings", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ posts: [draft], pagination }));
    const first = await kit.posts.list({ include_content: true, per_page: 25 });
    const response = {
      posts: [],
      pagination: {
        ...pagination,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
      },
    } satisfies ListPosts;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(
      await kit.posts.list({
        after: first.pagination.end_cursor!,
        include_content: true,
        per_page: 25,
      })
    ).toEqual(response);
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[1]!.url).searchParams)
    ).toEqual({
      after: "next+/=",
      include_content: "true",
      per_page: "25",
    });
  });

  it("preserves empty results, null cursors, and a zero count", async () => {
    const response = {
      posts: [],
      pagination: {
        ...pagination,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
        total_count: 0,
      },
    } satisfies ListPosts;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.posts.list({ include_total_count: true })).toEqual(
      response
    );
    request({ include_total_count: "true" });
  });

  it.each([1, 1000])("sends a page size of %s", async (per_page) => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ posts: [], pagination: { ...pagination, per_page } })
    );
    await kit.posts.list({ per_page });
    request({ per_page: String(per_page) });
  });

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(kit.posts.list()).rejects.toThrow("Authentication failed");
    request();
  });
});

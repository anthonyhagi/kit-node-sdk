import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type ListPosts,
  type ListPostsParams,
  type ListPostsWithContent,
} from "~/index";

const metadata = {
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
};
const pagination = {
  has_previous_page: false,
  has_next_page: false,
  start_cursor: null,
  end_cursor: null,
  per_page: 500,
};

describe("post list response inference", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each(["", "<p>Post HTML</p>"])(
    "requires HTML content when requested, including %j",
    async (content) => {
      const response = {
        posts: [
          {
            ...metadata,
            content,
          },
        ],
        pagination,
      } satisfies ListPostsWithContent;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const controller = new AbortController();
      const result = await kit.posts.list(
        { include_content: true, after: null, per_page: 25 },
        { signal: controller.signal }
      );
      expectTypeOf(result).toEqualTypeOf<ListPostsWithContent>();
      expectTypeOf(result).toExtend<ListPosts>();
      expectTypeOf<
        (typeof result)["posts"][number]["content"]
      >().toEqualTypeOf<string>();
      expect(result).toEqual(response);
      expect(
        Object.fromEntries(new URL(fetchMock.requests()[0]!.url).searchParams)
      ).toEqual({
        include_content: "true",
        per_page: "25",
      });
      expect(fetchMock.mock.calls[0]![1]?.signal).toBe(controller.signal);
      expectTypeOf<{
        posts: (typeof metadata)[];
        pagination: typeof pagination;
      }>().not.toExtend<ListPostsWithContent>();
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
        posts: [metadata],
        pagination,
      } satisfies ListPosts;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const result = await kit.posts.list(params);
      expectTypeOf(result).toEqualTypeOf<ListPosts>();
      expectTypeOf<(typeof result)["posts"][number]["content"]>().toEqualTypeOf<
        string | undefined
      >();
      expect(result).toEqual(response);
      expect(result.posts[0]).not.toHaveProperty("content");
    }
  );

  it.each([true, false])(
    "keeps broad parameters safe with include_content: %s",
    async (include_content) => {
      const params: ListPostsParams = { include_content };
      fetchMock.mockResponseOnce(JSON.stringify({ posts: [], pagination }));
      const kit = new Kit({ apiKey: "test", maxRetries: 0 });
      const result = await kit.posts.list(params);
      expectTypeOf(result).toEqualTypeOf<ListPosts | ListPostsWithContent>();
      expectTypeOf(result).toExtend<ListPosts>();
      expectTypeOf<(typeof result)["posts"][number]["content"]>().toEqualTypeOf<
        string | undefined
      >();
      expect(result.posts).toEqual([]);
    }
  );
});

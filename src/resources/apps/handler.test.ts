import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  ApiError,
  Kit,
  NotFoundError,
  type App,
  type AppCategory,
  type AppListItem,
  type GetApp,
  type ListApps,
  type ListAppsParams,
} from "~/index";

const listItem = {
  id: 1245,
  name: "Calendar Sync",
  summary: "Let subscribers book a call from your emails",
  icon_url: "https://embed.filekit.com/e/calendar-sync-icon",
  categories: ["scheduling"],
  pricing: "free",
  plan_availability: "paid_plans",
  installable: true,
  access_types: ["api", "plugin"],
  published_at: "2026-03-04T09:12:00Z",
  app_store_url: "https://app.kit.com/apps/1245",
  owned: false,
  status: "published",
} satisfies AppListItem;

const ownedDraft = {
  ...listItem,
  id: 2001,
  name: "My Draft App",
  summary: null,
  icon_url: null,
  categories: ["ai_connectors", "workflows"],
  pricing: "paid",
  plan_availability: "pro",
  published_at: null,
  owned: true,
  status: "unpublished",
} satisfies AppListItem;

const app = {
  ...listItem,
  upgrade_required: false,
  description: "<script>alert(1)</script> Booking links for your emails.",
  capabilities: {
    api_access: true,
    plugins: [
      { kind: "content_blocks", env: "content_blocks", label: "Content Block" },
    ],
  },
  links: {
    knowledge_base_url: null,
    website_url: "https://calendarsync.example.com",
    privacy_policy_url: null,
    support_url: null,
  },
  media_links: [
    "https://embed.filekit.com/e/calendar-sync-1",
    "https://embed.filekit.com/e/calendar-sync-2",
  ],
  install_url: "https://partner.example.com/install",
} satisfies App;

const page = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "c3RhcnQ=",
  end_cursor: "search+cursor/==",
  per_page: 50,
};

function request(index = 0) {
  const req = fetchMock.requests()[index]!;
  return { req, url: new URL(req.url) };
}

describe("app catalog requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 2, retryDelay: 0 });
  });

  it("lists apps without a query string by default", async () => {
    const response = { apps: [listItem], pagination: page } satisfies ListApps;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.apps.list();
    expectTypeOf(result).toEqualTypeOf<ListApps>();
    expect(result).toEqual(response);
    const { req, url } = request();
    expect(req.method).toBe("GET");
    expect(url.origin + url.pathname).toBe("https://api.kit.com/v4/apps");
    expect(url.search).toBe("");
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
  });

  it.each([
    { name: "one category", category: "crm", expected: "crm" },
    {
      name: "several categories",
      category: ["crm", "ai_connectors"],
      expected: "crm,ai_connectors",
    },
    {
      name: "an unknown future category",
      category: "new_kind",
      expected: "new_kind",
    },
  ] satisfies {
    name: string;
    category: ListAppsParams["category"];
    expected: string;
  }[])(
    "sends $name as Kit's comma-separated list",
    async ({ category, expected }) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ apps: [], pagination: page })
      );
      await kit.apps.list({ category });
      expect(request().url.searchParams.get("category")).toBe(expected);
    }
  );

  it("encodes search text and passes opaque cursors back unchanged", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ apps: [], pagination: page }));
    await kit.apps.list({
      query: "book & pay + tag/=?",
      category: "scheduling",
      after: page.end_cursor,
      per_page: 100,
      include_total_count: false,
    });
    const { searchParams } = request().url;
    expect(Object.fromEntries(searchParams)).toEqual({
      query: "book & pay + tag/=?",
      category: "scheduling",
      after: "search+cursor/==",
      per_page: "100",
      include_total_count: "false",
    });
  });

  it("keeps query and category when following both cursors", async () => {
    fetchMock.mockResponse(JSON.stringify({ apps: [], pagination: page }));
    const filters = { query: "calendar", category: ["scheduling"] };
    await kit.apps.list({ ...filters, after: "next" });
    await kit.apps.list({ ...filters, before: "prev" });
    const cursors = [
      ["after", "next"],
      ["before", "prev"],
    ] as const;
    for (const [index, [cursor, value]] of cursors.entries()) {
      const params = request(index).url.searchParams;
      expect(params.get(cursor)).toBe(value);
      expect(params.get("query")).toBe("calendar");
      expect(params.get("category")).toBe("scheduling");
    }
  });

  it.each([
    {
      name: "null pagination and search",
      params: { after: null, before: null, per_page: null, query: null },
    },
    { name: "an empty category list", params: { category: [] } },
    {
      name: "undefined filters",
      params: { category: undefined, query: undefined },
    },
  ] satisfies { name: string; params: ListAppsParams }[])(
    "omits $name",
    async ({ params }) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ apps: [], pagination: page })
      );
      await kit.apps.list(params);
      expect(request().url.search).toBe("");
    }
  );

  it("returns an empty successful page, such as ai_connectors alone", async () => {
    const response = {
      apps: [],
      pagination: {
        ...page,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
        total_count: 0,
      },
    } satisfies ListApps;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(
      await kit.apps.list({
        category: "ai_connectors",
        include_total_count: true,
      })
    ).toEqual(response);
  });

  it("returns owned unpublished apps with nullable listing fields", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ apps: [listItem, ownedDraft], pagination: page })
    );
    const { apps } = await kit.apps.list();
    expect(apps[1]).toEqual(ownedDraft);
    expectTypeOf(apps[0]!.summary).toEqualTypeOf<string | null>();
    expectTypeOf(apps[0]!.published_at).toEqualTypeOf<string | null>();
    expectTypeOf<AppListItem>().not.toHaveProperty("install_url");
    expectTypeOf<AppListItem>().not.toHaveProperty("description");
  });

  it("gets full app details without following the install URL", async () => {
    const response = { app } satisfies GetApp;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.apps.get(1245);
    expectTypeOf(result).toEqualTypeOf<GetApp>();
    expectTypeOf(result.app.install_url).toEqualTypeOf<string | null>();
    expectTypeOf(result.app.categories).toEqualTypeOf<AppCategory[]>();
    expect(result).toEqual(response);
    expect(result.app.description).toBe(app.description);
    expect(fetchMock.requests()).toHaveLength(1);
    expect(request().url.pathname).toBe("/v4/apps/1245");
  });

  it("returns a null install URL and missing links unchanged", async () => {
    const notInstallable = {
      ...app,
      installable: false,
      upgrade_required: true,
      install_url: null,
      capabilities: { api_access: false, plugins: [] },
      links: {
        knowledge_base_url: null,
        website_url: null,
        privacy_policy_url: null,
        support_url: null,
      },
      media_links: [],
    } satisfies App;
    fetchMock.mockResponseOnce(JSON.stringify({ app: notInstallable }));
    expect((await kit.apps.get(1245)).app).toEqual(notInstallable);
  });

  it("throws NotFoundError for hidden or missing apps", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    await expect(kit.apps.get(999)).rejects.toBeInstanceOf(NotFoundError);
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("throws 422 for invalid filters, mixed cursors or deep search pages without retrying", async () => {
    const details = {
      errors: ["Search results are limited to the first 10,000"],
    };
    fetchMock.mockResponseOnce(JSON.stringify(details), { status: 422 });
    const result = kit.apps.list({ query: "email", after: "deep" });
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ status: 422, details });
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("retries a 503 search outage under the client policy", async () => {
    fetchMock.mockResponses(
      [JSON.stringify({ errors: ["Search unavailable"] }), { status: 503 }],
      [JSON.stringify({ apps: [], pagination: page }), { status: 200 }]
    );
    await kit.apps.list({ query: "email" });
    expect(fetchMock.requests()).toHaveLength(2);
  });

  it("honors maxRetries: 0 for a 503", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["Search unavailable"] }),
      {
        status: 503,
      }
    );
    await expect(
      kit.apps.list({ query: "email" }, { maxRetries: 0 })
    ).rejects.toMatchObject({ name: "ApiError", status: 503 });
    expect(fetchMock.requests()).toHaveLength(1);
  });
});

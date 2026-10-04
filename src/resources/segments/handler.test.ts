import { beforeEach, describe, expect, it } from "vitest";
import { Kit } from "~/index";

const segment = {
  id: 75,
  name: "Readers & customers ✨",
  created_at: "2026-01-01T00:00:00Z",
};
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};

function request(query = {}) {
  const requests = fetchMock.requests();
  expect(requests).toHaveLength(1);
  const req = requests[0]!;
  const url = new URL(req.url);
  expect(req.method).toBe("GET");
  expect(url.origin).toBe("https://api.kit.com");
  expect(url.pathname).toBe("/v4/segments");
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("segment requests through Kit", () => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists segments with API-key authentication and no body or query", async () => {
    const response = { segments: [segment], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.segments.list()).toEqual(response);
    const req = request();
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.text()).toBe("");
  });

  it("preserves an empty last page and null cursors", async () => {
    const response = {
      segments: [],
      pagination: {
        ...pagination,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
      },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.segments.list()).toEqual(response);
    request();
  });

  it.each(["after", "before"] as const)(
    "encodes the %s cursor with page size and total count",
    async (cursor) => {
      const response = {
        segments: [segment],
        pagination: { ...pagination, total_count: 42 },
      };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.segments.list({
          [cursor]: "next+/=",
          per_page: 25,
          include_total_count: true,
        })
      ).toEqual(response);
      request({
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
      });
    }
  );

  it.each([1, 1000])("sends a page size of %i on its own", async (per_page) => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ segments: [], pagination: { ...pagination, per_page } })
    );
    await kit.segments.list({ per_page });
    request({ per_page: String(per_page) });
  });

  it("omits a disabled total count while preserving the cursor", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ segments: [], pagination }));
    await kit.segments.list({ after: "next+/=", include_total_count: false });
    request({ after: "next+/=" });
  });

  it.each([
    { status: 401, message: "The API key is invalid" },
    { status: 422, message: "Invalid pagination cursor" },
  ])(
    "surfaces a $status API error without retrying",
    async ({ status, message }) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: [message] }), {
        status,
      });
      await expect(kit.segments.list({ after: "invalid" })).rejects.toThrow(
        message
      );
      request({ after: "invalid" });
    }
  );
});

import { beforeEach, describe, expect, it } from "vitest";
import { Kit } from "~/index";

const templates = [
  { id: 36, name: "Custom HTML ✨", is_default: false, category: "HTML" },
  { id: 35, name: "Story", is_default: false, category: "Starting point" },
  { id: 6, name: "Text Only", is_default: true, category: "HTML" },
];
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
  expect(url.pathname).toBe("/v4/email_templates");
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("email-template requests through Kit", () => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists templates with API-key authentication and no body or query", async () => {
    const response = { email_templates: templates, pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.emailTemplates.list()).toEqual(response);
    const req = request();
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.text()).toBe("");
  });

  it("preserves an empty last page and null cursors", async () => {
    const response = {
      email_templates: [],
      pagination: {
        ...pagination,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
      },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.emailTemplates.list()).toEqual(response);
    request();
  });

  it.each(["after", "before"] as const)(
    "encodes the %s cursor with page size and total count",
    async (cursor) => {
      const response = {
        email_templates: templates,
        pagination: { ...pagination, total_count: 42 },
      };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.emailTemplates.list({
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
      JSON.stringify({
        email_templates: [],
        pagination: { ...pagination, per_page },
      })
    );
    await kit.emailTemplates.list({ per_page });
    request({ per_page: String(per_page) });
  });

  it("requests the total count without a cursor and preserves it", async () => {
    const response = {
      email_templates: templates,
      pagination: { ...pagination, total_count: 42 },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(
      await kit.emailTemplates.list({ include_total_count: true })
    ).toEqual(response);
    request({ include_total_count: "true" });
  });

  it("omits a disabled total count while preserving the cursor", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ email_templates: [], pagination })
    );
    await kit.emailTemplates.list({
      after: "next+/=",
      include_total_count: false,
    });
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
      await expect(
        kit.emailTemplates.list({ after: "invalid" })
      ).rejects.toThrow(message);
      request({ after: "invalid" });
    }
  );
});

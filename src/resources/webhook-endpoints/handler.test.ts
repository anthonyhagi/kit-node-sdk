import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type ListWebhookEndpoints,
  type ListWebhookEndpointsParams,
  type WebhookEndpoint,
  type WebhookEndpointStatus,
} from "~/index";

const endpoint = {
  id: 2,
  name: "My webhook",
  url: "https://hooks.example.com/incoming",
  events: ["custom_field.created", "subscriber.created"],
  status: "active",
  source: "creator",
  description: "A test webhook",
  created_by_app: null,
  created_at: "2023-02-17T11:43:55Z",
  previous_secret_expires_at: null,
} satisfies WebhookEndpoint;
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
  expect(url.pathname).toBe("/v4/webhook_endpoints");
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("webhook endpoint list requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists endpoint metadata with multiple events and no defaults or request body", async () => {
    const response = {
      webhook_endpoints: [endpoint],
      pagination,
    } satisfies ListWebhookEndpoints;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.webhookEndpoints.list();
    expectTypeOf(result).toEqualTypeOf<ListWebhookEndpoints>();
    expectTypeOf(result.webhook_endpoints[0]!.events).toEqualTypeOf<string[]>();
    expectTypeOf(
      result.webhook_endpoints[0]!.previous_secret_expires_at
    ).toEqualTypeOf<string | null>();
    expectTypeOf(
      result.webhook_endpoints[0]!.created_by_app
    ).toEqualTypeOf<unknown>();
    expectTypeOf(result.pagination.total_count).toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<"secret">().not.toExtend<keyof WebhookEndpoint>();
    expectTypeOf<{
      status: "invalid";
    }>().not.toExtend<ListWebhookEndpointsParams>();
    expect(result).toEqual(response);
    expect(result.webhook_endpoints[0]).not.toHaveProperty("secret");
    const req = request();
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.text()).toBe("");
  });

  it.each(["active", "disabled"] satisfies WebhookEndpointStatus[])(
    "filters status: %s",
    async (status) => {
      const response = {
        webhook_endpoints: [{ ...endpoint, status }],
        pagination,
      } satisfies ListWebhookEndpoints;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(await kit.webhookEndpoints.list({ status })).toEqual(response);
      request({ status });
    }
  );

  it.each(["after", "before"] as const)(
    "combines %s pagination with status and counts",
    async (cursor) => {
      const response = {
        webhook_endpoints: [endpoint],
        pagination: { ...pagination, total_count: 42, per_page: 25 },
      } satisfies ListWebhookEndpoints;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.webhookEndpoints.list({
          [cursor]: "next+/=",
          status: "active",
          include_total_count: true,
          per_page: 25,
        })
      ).toEqual(response);
      request({
        [cursor]: "next+/=",
        status: "active",
        include_total_count: "true",
        per_page: "25",
      });
    }
  );

  it("preserves false total-count flags and omits undefined fields", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ webhook_endpoints: [], pagination })
    );
    await kit.webhookEndpoints.list({
      include_total_count: false,
      status: undefined,
      per_page: undefined,
    });
    request({ include_total_count: "false" });
  });

  it("preserves app metadata and the previous secret expiry timestamp", async () => {
    const response = {
      webhook_endpoints: [
        {
          ...endpoint,
          created_by_app: { id: 42, name: "Integration" },
          source: "app",
          description: "",
          events: ["subscriber.created", "future.event"],
          previous_secret_expires_at: "2026-10-05T12:00:00Z",
        },
      ],
      pagination,
    } satisfies ListWebhookEndpoints;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.webhookEndpoints.list()).toEqual(response);
  });

  it("follows the returned cursor while preserving the status filter", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ webhook_endpoints: [endpoint], pagination })
    );
    const first = await kit.webhookEndpoints.list({
      status: "disabled",
      per_page: 25,
    });
    const response = {
      webhook_endpoints: [],
      pagination: {
        ...pagination,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
      },
    } satisfies ListWebhookEndpoints;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(
      await kit.webhookEndpoints.list({
        after: first.pagination.end_cursor!,
        status: "disabled",
        per_page: 25,
      })
    ).toEqual(response);
    expect(
      Object.fromEntries(new URL(fetchMock.requests()[1]!.url).searchParams)
    ).toEqual({
      after: "next+/=",
      status: "disabled",
      per_page: "25",
    });
  });

  it("preserves an empty page, null cursors, and a zero count", async () => {
    const response = {
      webhook_endpoints: [],
      pagination: {
        ...pagination,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
        total_count: 0,
      },
    } satisfies ListWebhookEndpoints;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(
      await kit.webhookEndpoints.list({ include_total_count: true })
    ).toEqual(response);
    request({ include_total_count: "true" });
  });

  it.each([1, 1000])("sends page size %s", async (per_page) => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        webhook_endpoints: [],
        pagination: { ...pagination, per_page },
      })
    );
    await kit.webhookEndpoints.list({ per_page });
    request({ per_page: String(per_page) });
  });

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(kit.webhookEndpoints.list()).rejects.toThrow(
      "Authentication failed"
    );
    request();
  });
});

import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type CreateWebhookEndpoint,
  type CreateWebhookEndpointParams,
  type GetWebhookEndpoint,
  type ListWebhookEndpoints,
  type ListWebhookEndpointsParams,
  type UpdateWebhookEndpoint,
  type UpdateWebhookEndpointParams,
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

describe("webhook endpoint get requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("retrieves endpoint metadata without a signing secret, query, or body", async () => {
    const response = {
      webhook_endpoint: endpoint,
    } satisfies GetWebhookEndpoint;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.webhookEndpoints.get(2);
    expectTypeOf(result).toEqualTypeOf<GetWebhookEndpoint | null>();
    expectTypeOf(result!.webhook_endpoint).toEqualTypeOf<WebhookEndpoint>();
    expectTypeOf<"secret">().not.toExtend<
      keyof GetWebhookEndpoint["webhook_endpoint"]
    >();
    expect(result).toEqual(response);
    expect(result!.webhook_endpoint).not.toHaveProperty("secret");
    expect(fetchMock.requests()).toHaveLength(1);
    const req = fetchMock.requests()[0]!;
    expect(req.method).toBe("GET");
    expect(req.url).toBe("https://api.kit.com/v4/webhook_endpoints/2");
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.text()).toBe("");
  });

  it("preserves disabled status, opaque app metadata, and secret expiry", async () => {
    const response = {
      webhook_endpoint: {
        ...endpoint,
        status: "disabled",
        source: "app",
        created_by_app: { id: 42, name: "Integration" },
        description: "",
        events: ["subscriber.created", "future.event"],
        previous_secret_expires_at: "2026-10-05T12:00:00Z",
      },
    } satisfies GetWebhookEndpoint;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.webhookEndpoints.get(2)).toEqual(response);
  });

  it("returns null for missing or inaccessible endpoints", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(await kit.webhookEndpoints.get(404)).toBeNull();
    expect(fetchMock.requests()[0]!.url).toBe(
      "https://api.kit.com/v4/webhook_endpoints/404"
    );
    expect(await fetchMock.requests()[0]!.text()).toBe("");
  });

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(kit.webhookEndpoints.get(2)).rejects.toThrow(
      "Authentication failed"
    );
    expect(fetchMock.requests()).toHaveLength(1);
  });
});

describe("webhook endpoint create requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("creates an endpoint with only URL and events and exposes the signing secret", async () => {
    const params = {
      url: endpoint.url,
      events: ["subscriber.created", "custom_field.created"],
    } satisfies CreateWebhookEndpointParams;
    const response = {
      webhook_endpoint: {
        ...endpoint,
        events: params.events,
        secret: "whsec_test_fixture",
      },
    } satisfies CreateWebhookEndpoint;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    const result = await kit.webhookEndpoints.create(params);
    expectTypeOf(result).toEqualTypeOf<CreateWebhookEndpoint>();
    expectTypeOf(result.webhook_endpoint.secret).toEqualTypeOf<string>();
    expectTypeOf<typeof endpoint>().not.toExtend<
      CreateWebhookEndpoint["webhook_endpoint"]
    >();
    expectTypeOf<{ url: string }>().not.toExtend<CreateWebhookEndpointParams>();
    expectTypeOf<{
      events: string[];
    }>().not.toExtend<CreateWebhookEndpointParams>();
    expect(result).toEqual(response);
    expect(fetchMock.requests()).toHaveLength(1);
    const req = fetchMock.requests()[0]!;
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://api.kit.com/v4/webhook_endpoints");
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.json()).toEqual(params);
  });

  it("preserves optional names, empty descriptions, and event strings", async () => {
    const params = {
      url: endpoint.url,
      events: ["subscriber.created", "future.event"],
      name: "Integration & alerts",
      description: "",
    } satisfies CreateWebhookEndpointParams;
    const response = {
      webhook_endpoint: {
        ...endpoint,
        ...params,
        created_by_app: { id: 42 },
        source: "app",
        secret: "whsec_test_fixture",
      },
    } satisfies CreateWebhookEndpoint;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    expect(await kit.webhookEndpoints.create(params)).toEqual(response);
    expect(await fetchMock.requests()[0]!.json()).toEqual(params);
  });

  it("omits undefined metadata without supplying defaults", async () => {
    const params = {
      url: endpoint.url,
      events: ["subscriber.created"],
      name: undefined,
      description: undefined,
    } satisfies CreateWebhookEndpointParams;
    fetchMock.mockResponseOnce(
      JSON.stringify({
        webhook_endpoint: { ...endpoint, secret: "whsec_test_fixture" },
      }),
      { status: 201 }
    );
    await kit.webhookEndpoints.create(params);
    expect(await fetchMock.requests()[0]!.json()).toEqual({
      url: endpoint.url,
      events: ["subscriber.created"],
    });
  });

  it("surfaces API validation errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["url must be publicly reachable"] }),
      { status: 422 }
    );
    const params = {
      url: "http://localhost/hooks",
      events: ["subscriber.created"],
    } satisfies CreateWebhookEndpointParams;
    await expect(kit.webhookEndpoints.create(params)).rejects.toThrow(
      "url must be publicly reachable"
    );
    expect(await fetchMock.requests()[0]!.json()).toEqual(params);
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(
      kit.webhookEndpoints.create({
        url: endpoint.url,
        events: ["subscriber.created"],
      })
    ).rejects.toThrow("Authentication failed");
  });
});

describe("webhook endpoint update requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("PATCHes only supplied metadata and omits undefined fields", async () => {
    const params = {
      name: "Updated name",
      description: undefined,
    } satisfies UpdateWebhookEndpointParams;
    const response = {
      webhook_endpoint: { ...endpoint, name: "Updated name" },
    } satisfies UpdateWebhookEndpoint;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.webhookEndpoints.update(2, params);
    expectTypeOf(result).toEqualTypeOf<UpdateWebhookEndpoint | null>();
    expectTypeOf(result!.webhook_endpoint).toEqualTypeOf<WebhookEndpoint>();
    expectTypeOf<{
      status: "invalid";
    }>().not.toExtend<UpdateWebhookEndpointParams>();
    expect(result).toEqual(response);
    expect(result!.webhook_endpoint).not.toHaveProperty("secret");
    expect(fetchMock.requests()).toHaveLength(1);
    const req = fetchMock.requests()[0]!;
    expect(req.method).toBe("PATCH");
    expect(req.url).toBe("https://api.kit.com/v4/webhook_endpoints/2");
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.json()).toEqual({ name: "Updated name" });
  });

  it.each(["active", "disabled"] satisfies WebhookEndpointStatus[])(
    "updates status to %s",
    async (status) => {
      const response = {
        webhook_endpoint: { ...endpoint, status },
      } satisfies UpdateWebhookEndpoint;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(await kit.webhookEndpoints.update(2, { status })).toEqual(
        response
      );
      expect(await fetchMock.requests()[0]!.json()).toEqual({ status });
    }
  );

  it("replaces events without merging previous subscriptions and preserves empty metadata", async () => {
    const params = {
      name: "",
      url: "https://hooks.example.com/v2",
      description: "",
      events: ["subscriber.activated", "future.event"],
      status: "active",
    } satisfies UpdateWebhookEndpointParams;
    const response = {
      webhook_endpoint: { ...endpoint, ...params },
    } satisfies UpdateWebhookEndpoint;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.webhookEndpoints.update(2, params)).toEqual(response);
    expect(await fetchMock.requests()[0]!.json()).toEqual(params);
  });

  it("preserves an explicit empty event list for server validation", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["events can't be blank"] }),
      { status: 422 }
    );
    await expect(
      kit.webhookEndpoints.update(2, { events: [] })
    ).rejects.toThrow("events can't be blank");
    expect(await fetchMock.requests()[0]!.json()).toEqual({ events: [] });
  });

  it("allows empty updates without injecting defaults", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ webhook_endpoint: endpoint }));
    expect(await kit.webhookEndpoints.update(2, {})).toEqual({
      webhook_endpoint: endpoint,
    });
    expect(await fetchMock.requests()[0]!.json()).toEqual({});
  });

  it("returns null for missing endpoints", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(
      await kit.webhookEndpoints.update(404, { status: "disabled" })
    ).toBeNull();
    expect(fetchMock.requests()[0]!.url).toBe(
      "https://api.kit.com/v4/webhook_endpoints/404"
    );
  });

  it("surfaces app ownership restrictions", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        errors: ["Endpoint can only be updated by the app that created it"],
      }),
      { status: 403 }
    );
    await expect(
      kit.webhookEndpoints.update(2, { name: "Updated" })
    ).rejects.toThrow(
      "Endpoint can only be updated by the app that created it"
    );
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("surfaces authentication errors", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["The access token is invalid"] }),
      { status: 401 }
    );
    await expect(
      kit.webhookEndpoints.update(2, { status: "disabled" })
    ).rejects.toThrow("Authentication failed");
  });
});

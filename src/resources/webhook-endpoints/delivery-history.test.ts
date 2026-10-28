import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  ApiError,
  Kit,
  type GetWebhookDelivery,
  type GetWebhookDeliveryParams,
  type ListWebhookDeliveries,
  type ListWebhookDeliveriesParams,
  type WebhookDeliveryAttempt,
  type WebhookDeliveryDetails,
  type WebhookDeliveryEvent,
  type WebhookDeliveryRecord,
  type WebhookDeliveryStatus,
} from "~/index";

const record = {
  id: 123456,
  event_type: "subscriber.created",
  status: "failed",
  attempt_count: 2,
  created_at: "2026-10-20T12:00:00Z",
  completed_at: "2026-10-20T12:01:00Z",
} satisfies WebhookDeliveryRecord;
const attempt = {
  id: 2,
  attempt_number: 2,
  status_code: null,
  error_message: "Connection refused",
  response_body: null,
  duration_ms: null,
  attempted_at: "2026-10-20T12:01:00Z",
} satisfies WebhookDeliveryAttempt;
const details = {
  ...record,
  attempts: [
    attempt,
    {
      ...attempt,
      id: 1,
      attempt_number: 1,
      status_code: 500,
      error_message: null,
      response_body: "Internal Server Error",
      duration_ms: 212,
    },
  ],
} satisfies WebhookDeliveryDetails;
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 500,
};
const page = {
  deliveries: [record, { ...record, id: 123455, completed_at: null }],
  pagination,
} satisfies ListWebhookDeliveries;

function request(path: string, query = {}) {
  const req = fetchMock.requests().at(-1)!;
  expect(req.method).toBe("GET");
  const url = new URL(req.url);
  expect(url.origin).toBe("https://api.kit.com");
  expect(url.pathname).toBe(`/v4/webhook_endpoints/${path}`);
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("webhook delivery history", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists typed records without adding defaults or a body", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(page));
    const result = await kit.webhookEndpoints.listDeliveries(42);
    expectTypeOf(result).toEqualTypeOf<ListWebhookDeliveries | null>();
    expectTypeOf(result!.deliveries[0]!.completed_at).toEqualTypeOf<
      string | null
    >();
    expectTypeOf<{
      status: "invalid";
    }>().not.toExtend<ListWebhookDeliveriesParams>();
    expectTypeOf<{
      include_payload: string;
    }>().not.toExtend<GetWebhookDeliveryParams>();
    expect(result).toEqual(page);
    const req = request("42/deliveries");
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(await req.text()).toBe("");
  });

  it.each([
    "pending",
    "delivered",
    "failed",
    "retrying",
  ] satisfies WebhookDeliveryStatus[])(
    "combines %s with event and pagination filters",
    async (status) => {
      fetchMock.mockResponseOnce(JSON.stringify(page));
      await kit.webhookEndpoints.listDeliveries(42, {
        status,
        event_type: "subscriber.created",
        before: "prev+/=",
        per_page: 1000,
      });
      request("42/deliveries", {
        status,
        event_type: "subscriber.created",
        before: "prev+/=",
        per_page: "1000",
      });
    }
  );

  it("follows the returned cursor and preserves filters", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(page));
    const first = await kit.webhookEndpoints.listDeliveries(42, {
      status: "failed",
    });
    const empty = {
      deliveries: [],
      pagination: {
        ...pagination,
        has_next_page: false,
        start_cursor: null,
        end_cursor: null,
      },
    } satisfies ListWebhookDeliveries;
    fetchMock.mockResponseOnce(JSON.stringify(empty));
    expect(
      await kit.webhookEndpoints.listDeliveries(42, {
        status: "failed",
        after: first!.pagination.end_cursor,
      })
    ).toEqual(empty);
    request("42/deliveries", { status: "failed", after: "next+/=" });
  });

  it("omits nullable pagination and undefined filters", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(page));
    await kit.webhookEndpoints.listDeliveries(42, {
      after: null,
      before: null,
      per_page: null,
      status: undefined,
      event_type: undefined,
    });
    request("42/deliveries");
  });

  it.each([undefined, true, false])(
    "preserves include_payload=%s",
    async (include_payload) => {
      const response: GetWebhookDelivery = {
        delivery: {
          ...details,
          ...(include_payload === true && {
            payload: [
              {
                id: "event-uuid",
                type: "tag.created",
                created: record.created_at,
                data: {
                  tag: { id: 1, name: "Test", created_at: record.created_at },
                },
              },
            ],
          }),
        },
      };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.webhookEndpoints.getDelivery(42, 123456, {
        include_payload,
      });
      expectTypeOf(result).toEqualTypeOf<GetWebhookDelivery | null>();
      expectTypeOf(result!.delivery.payload).toEqualTypeOf<
        WebhookDeliveryEvent[] | undefined
      >();
      expect(result).toEqual(response);
      const req = request(
        "42/deliveries/123456",
        include_payload === undefined
          ? {}
          : { include_payload: String(include_payload) }
      );
      expect(await req.text()).toBe("");
      if (include_payload !== true)
        expect(result!.delivery).not.toHaveProperty("payload");
    }
  );

  it("gets details with omitted params and keeps OAuth authentication", async () => {
    const oauth = new Kit({
      apiKey: "test-token",
      authType: "oauth",
      maxRetries: 0,
    });
    fetchMock.mockResponseOnce(JSON.stringify({ delivery: details }));
    expect(await oauth.webhookEndpoints.getDelivery(21, 4)).toEqual({
      delivery: details,
    });
    expect(request("21/deliveries/4").headers.get("Authorization")).toBe(
      "Bearer test-token"
    );
  });

  it.each(["list", "get"] as const)(
    "returns null for %s history when missing, expired, or inaccessible",
    async (method) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
        status: 404,
      });
      const result =
        method === "list"
          ? kit.webhookEndpoints.listDeliveries(42)
          : kit.webhookEndpoints.getDelivery(42, 123456);
      await expect(result).resolves.toBeNull();
    }
  );

  it.each(["list", "get"] as const)(
    "surfaces %s validation errors without retries",
    async (method) => {
      const errors = { errors: ["Invalid filter or include_payload"] };
      fetchMock.mockResponseOnce(JSON.stringify(errors), { status: 422 });
      const result =
        method === "list"
          ? kit.webhookEndpoints.listDeliveries(42, { status: "failed" })
          : kit.webhookEndpoints.getDelivery(42, 123456, {
              include_payload: false,
            });
      await expect(result).rejects.toMatchObject({
        name: "ApiError",
        status: 422,
        details: errors,
      });
      await expect(result).rejects.toBeInstanceOf(ApiError);
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );
});

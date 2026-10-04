import { beforeEach, describe, expect, it } from "vitest";
import { Kit, type WebhookEvent } from "~/index";

const targetUrl = "https://example.com/hooks/kit?source=newsletter&token=a%2Bb";
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};
const events = [
  { name: "subscriber.subscriber_activate" },
  { name: "subscriber.subscriber_unsubscribe" },
  { name: "subscriber.subscriber_bounce" },
  { name: "subscriber.subscriber_complain" },
  { name: "subscriber.form_subscribe", form_id: 7 },
  { name: "subscriber.course_subscribe", sequence_id: 8 },
  { name: "subscriber.course_complete", sequence_id: 8 },
  {
    name: "subscriber.link_click",
    initiator_value: "https://example.com/article?topic=kit&source=email",
  },
  { name: "subscriber.product_purchase", product_id: 9 },
  { name: "subscriber.tag_add", tag_id: 10 },
  { name: "subscriber.tag_remove", tag_id: 10 },
  { name: "purchase.purchase_create" },
] satisfies WebhookEvent[];

function request(method: string, path: string, query = {}) {
  const requests = fetchMock.requests();
  expect(requests).toHaveLength(1);
  const req = requests[0]!;
  const url = new URL(req.url);
  expect(req.method).toBe(method);
  expect(url.origin).toBe("https://api.kit.com");
  expect(url.pathname).toBe(`/v4${path}`);
  expect(Object.fromEntries(url.searchParams)).toEqual(query);
  return req;
}

describe("webhook requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists webhooks without optional pagination and preserves event configuration", async () => {
    const response = {
      webhooks: [
        {
          id: 1,
          account_id: 42,
          event: { name: "tag_add", tag_id: 10 },
          target_url: targetUrl,
        },
        {
          id: 2,
          account_id: 42,
          event: { name: "form_subscribe", form_id: 7 },
          target_url: "https://example.com/forms",
        },
      ],
      pagination,
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.webhooks.list()).toEqual(response);
    expect(await request("GET", "/webhooks").text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "encodes the %s cursor and pagination options",
    async (cursor) => {
      const response = { webhooks: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.webhooks.list({
          [cursor]: "next+/=",
          per_page: 25,
          include_total_count: true,
        })
      ).toEqual(response);
      request("GET", "/webhooks", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
      });
    }
  );

  it.each(events)(
    "creates a $name webhook with its event parameters and target URL",
    async (event) => {
      const body = { target_url: targetUrl, event };
      const response = {
        webhook: {
          id: 1,
          account_id: 42,
          target_url: targetUrl,
          event: { name: event.name, initiator_value: null },
        },
      };
      fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
      expect(await kit.webhooks.create(body)).toEqual(response);
      const req = request("POST", "/webhooks");
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(await req.json()).toEqual(body);
    }
  );

  it("preserves explicit null event fields and handles an existing webhook response", async () => {
    const body = {
      target_url: targetUrl,
      event: {
        name: "subscriber.subscriber_activate",
        form_id: null,
        sequence_id: null,
        tag_id: null,
        product_id: null,
        initiator_value: null,
      },
    };
    const response = { webhook: { id: 1, account_id: 42, ...body } };
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 200 });
    expect(await kit.webhooks.create(body)).toEqual(response);
    expect(await request("POST", "/webhooks").json()).toEqual(body);
  });

  it("passes through an unrecognized event name for API forward compatibility", async () => {
    const body = {
      target_url: targetUrl,
      event: {
        name: "subscriber.future_event",
        initiator_value: "custom-value",
      },
    };
    const response = { webhook: { id: 1, account_id: 42, ...body } };
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    expect(await kit.webhooks.create(body)).toEqual(response);
    expect(await request("POST", "/webhooks").json()).toEqual(body);
  });

  it("deletes by ID with a bodyless DELETE and handles a 204 response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await kit.webhooks.delete(1)).toEqual({});
    expect(await request("DELETE", "/webhooks/1").text()).toBe("");
  });

  it("returns null when the webhook to delete is missing", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
      status: 404,
    });
    expect(await kit.webhooks.delete(1)).toBeNull();
    request("DELETE", "/webhooks/1");
  });

  it("surfaces API validation errors without repeating creation", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["Invalid target URL"] }),
      { status: 422 }
    );
    const body = {
      target_url: "invalid",
      event: { name: "subscriber.subscriber_activate" },
    };
    await expect(kit.webhooks.create(body)).rejects.toThrow(
      "Invalid target URL"
    );
    expect(await request("POST", "/webhooks").json()).toEqual(body);
  });
});

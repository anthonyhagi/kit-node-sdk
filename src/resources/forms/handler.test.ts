import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type AddSubscriberToForm,
  type AddSubscriberToFormByEmail,
  type ListForms,
  type ListFormsParams,
} from "~/index";

const form = {
  id: 7,
  name: "Newsletter",
  created_at: "2026-01-01T00:00:00Z",
  type: "embed",
  format: "inline",
  embed_js: "<script></script>",
  embed_url: "https://example.com/form",
  archived: false,
  uid: "newsletter",
};
const subscriber = {
  id: 42,
  first_name: "Ada",
  email_address: "ada+newsletter@example.com",
  state: "active",
  created_at: "2026-01-01T00:00:00Z",
  added_at: "2026-02-01T00:00:00Z",
  fields: { interest: "TypeScript" },
};
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};
const referrer =
  "https://example.com/signup?utm_source=newsletter&utm_campaign=spring%20sale";

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

describe("form requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists forms without optional pagination or filters", async () => {
    const response = { forms: [form], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.forms.list()).toEqual(response);
    expect(await request("GET", "/forms").text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "encodes the %s form cursor with status and type filters",
    async (cursor) => {
      fetchMock.mockResponseOnce(JSON.stringify({ forms: [], pagination }));
      await kit.forms.list({
        [cursor]: "next+/=",
        include_total_count: true,
        per_page: 25,
        status: "archived",
        type: "hosted",
      });
      request("GET", "/forms", {
        [cursor]: "next+/=",
        include_total_count: "true",
        per_page: "25",
        status: "archived",
        type: "hosted",
      });
    }
  );

  it.each([0, 42])(
    "requests and preserves a subscriber count of %i",
    async (subscriber_count) => {
      const response = {
        forms: [{ ...form, subscriber_count }],
        pagination,
      } satisfies ListForms;
      const params = {
        include: "subscriber_count",
        after: "next+/=",
        per_page: 25,
        include_total_count: false,
        status: "archived",
        type: "hosted",
      } satisfies ListFormsParams;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.forms.list(params);
      expect(result).toEqual(response);
      expectTypeOf(result.forms[0]!.subscriber_count).toEqualTypeOf<
        number | undefined
      >();
      request("GET", "/forms", {
        include: "subscriber_count",
        after: "next+/=",
        per_page: "25",
        include_total_count: "false",
        status: "archived",
        type: "hosted",
      });
    }
  );

  it("omits undefined includes and accepts forms without subscriber counts", async () => {
    const response = { forms: [form], pagination } satisfies ListForms;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.forms.list({ include: undefined });
    expect(result).toEqual(response);
    expect(result.forms[0]!.subscriber_count).toBeUndefined();
    expect(await request("GET", "/forms").text()).toBe("");
  });

  it.each([200, 201])(
    "accepts a null first name when adding by ID with status %i",
    async (status) => {
      const response = {
        subscriber: { ...subscriber, first_name: null },
      } satisfies AddSubscriberToForm;
      fetchMock.mockResponseOnce(JSON.stringify(response), { status });
      const result = await kit.forms.addSubscriber(7, 42);
      expect(result).toEqual(response);
      expectTypeOf(result!.subscriber.first_name).toEqualTypeOf<
        string | null
      >();
      expect(await request("POST", "/forms/7/subscribers/42").json()).toEqual(
        {}
      );
    }
  );

  it.each([200, 201])(
    "accepts a null first name when adding by email with status %i",
    async (status) => {
      const response = {
        subscriber: { ...subscriber, first_name: null },
      } satisfies AddSubscriberToFormByEmail;
      fetchMock.mockResponseOnce(JSON.stringify(response), { status });
      const result = await kit.forms.addSubscriberByEmail(7, {
        email_address: subscriber.email_address,
      });
      expect(result).toEqual(response);
      expectTypeOf(result!.subscriber.first_name).toEqualTypeOf<
        string | null
      >();
      expect(await request("POST", "/forms/7/subscribers").json()).toEqual({
        email_address: subscriber.email_address,
      });
    }
  );

  it("accepts a null state when a subscriber is newly added by ID", async () => {
    const response = {
      subscriber: { ...subscriber, state: null },
    } satisfies AddSubscriberToForm;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    const result = await kit.forms.addSubscriber(7, 42);
    expectTypeOf(result!.subscriber.state).toEqualTypeOf<string | null>();
    expect(result).toEqual(response);
    expect(await request("POST", "/forms/7/subscribers/42").json()).toEqual({});
  });

  it("lists form subscribers without optional filters", async () => {
    const response = { subscribers: [subscriber], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.forms.listSubscribers(7)).toEqual(response);
    expect(await request("GET", "/forms/7/subscribers").text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "paginates form subscribers with %s and normalizes date filters",
    async (cursor) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ subscribers: [], pagination })
      );
      await kit.forms.listSubscribers(7, {
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
        status: "all",
        added_after: new Date("2026-01-01T00:00:00Z"),
        added_before: "2026-02-01",
        created_after: "2026-03-01",
        created_before: new Date("2026-04-01T00:00:00Z"),
      });
      request("GET", "/forms/7/subscribers", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
        status: "all",
        added_after: "2026-01-01T00:00:00.000Z",
        added_before: "2026-02-01",
        created_after: "2026-03-01",
        created_before: "2026-04-01T00:00:00.000Z",
      });
    }
  );

  it("adds a subscriber by email without a referrer", async () => {
    const body = { email_address: subscriber.email_address };
    const response = { subscriber };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.forms.addSubscriberByEmail(7, body)).toEqual(response);
    const req = request("POST", "/forms/7/subscribers");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual(body);
  });

  it.each(["string", "URL"] as const)(
    "preserves a %s referrer when adding by email",
    async (kind) => {
      const response = { subscriber: { ...subscriber, referrer } };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.forms.addSubscriberByEmail(7, {
          email_address: subscriber.email_address,
          referrer: kind === "URL" ? new URL(referrer) : referrer,
        })
      ).toEqual(response);
      expect(await request("POST", "/forms/7/subscribers").json()).toEqual({
        email_address: subscriber.email_address,
        referrer,
      });
    }
  );

  it("adds a subscriber by ID with an empty JSON body when options are omitted", async () => {
    const response = { subscriber } satisfies AddSubscriberToForm;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.forms.addSubscriber(7, 42);
    expectTypeOf(result).toEqualTypeOf<AddSubscriberToForm | null>();
    expectTypeOf<
      NonNullable<typeof result>["subscriber"]["first_name"]
    >().toEqualTypeOf<string | null>();
    expect(result).toEqual(response);
    expect(await request("POST", "/forms/7/subscribers/42").json()).toEqual({});
  });

  it.each(["string", "URL"] as const)(
    "preserves a %s referrer when adding by ID",
    async (kind) => {
      const response = { subscriber: { ...subscriber, referrer } };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.forms.addSubscriber(7, 42, {
          referrer: kind === "URL" ? new URL(referrer) : referrer,
        })
      ).toEqual(response);
      expect(await request("POST", "/forms/7/subscribers/42").json()).toEqual({
        referrer,
      });
    }
  );

  it("bulk adds subscribers with OAuth and preserves mixed results", async () => {
    kit = new Kit({ apiKey: "oauth-token", authType: "oauth", maxRetries: 0 });
    const body = {
      additions: [
        { form_id: 7, subscriber_id: 42, referrer },
        { form_id: 8, subscriber_id: 99 },
      ],
      callback_url: null,
    };
    const response = {
      subscribers: [{ ...subscriber, referrer }],
      failures: [
        {
          subscription: { form_id: 8, subscriber_id: null, referrer: "" },
          errors: ["Subscriber does not exist"],
        },
      ],
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.forms.bulkAddSubscribers(body)).toEqual({
      type: "synchronous",
      ...response,
    });
    const req = request("POST", "/bulk/forms/subscribers");
    expect(req.headers.get("Authorization")).toBe("Bearer oauth-token");
    expect(await req.json()).toEqual(body);
  });

  it("recognizes an empty subscribers array as a synchronous bulk response", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ subscribers: [], failures: [] })
    );
    const body = { additions: [{ form_id: 7, subscriber_id: 42 }] };
    expect(await kit.forms.bulkAddSubscribers(body)).toEqual({
      type: "synchronous",
      subscribers: [],
      failures: [],
    });
    expect(await request("POST", "/bulk/forms/subscribers").json()).toEqual(
      body
    );
  });

  it.each(["{}", ""])(
    "handles an asynchronous bulk response body %j and preserves the callback",
    async (responseBody) => {
      const body = {
        additions: Array.from({ length: 101 }, (_, i) => ({
          form_id: 7,
          subscriber_id: i + 1,
          referrer,
        })),
        callback_url: "https://example.com/hooks/kit?source=forms",
      };
      fetchMock.mockResponseOnce(responseBody, { status: 202 });
      expect(await kit.forms.bulkAddSubscribers(body)).toEqual({
        type: "asynchronous",
      });
      expect(await request("POST", "/bulk/forms/subscribers").json()).toEqual(
        body
      );
    }
  );

  it.each([
    "listSubscribers",
    "addSubscriber",
    "addSubscriberByEmail",
  ] as const)(
    "returns null from %s when the form or subscriber is missing",
    async (method) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
        status: 404,
      });
      let result;
      switch (method) {
        case "listSubscribers":
          result = await kit.forms.listSubscribers(7);
          break;
        case "addSubscriber":
          result = await kit.forms.addSubscriber(7, 42);
          break;
        case "addSubscriberByEmail":
          result = await kit.forms.addSubscriberByEmail(7, {
            email_address: subscriber.email_address,
          });
          break;
      }
      expect(result).toBeNull();
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );
});

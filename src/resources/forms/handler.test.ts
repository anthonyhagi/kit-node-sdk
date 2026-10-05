import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type AddSubscriberToForm,
  type AddSubscriberToFormByEmail,
  type AddSubscriberToFormByEmailParams,
  type BulkAddSubscribersParams,
  type BulkAddSubscribersSynchronous,
  type Form,
  type FormReferrerUtmParameters,
  type FormSubscriber,
  type ListForms,
  type ListFormsParams,
  type ListFormSubscribers,
  type ListFormSubscribersParams,
  type ListSlimFormSubscribers,
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

  it.each([
    { after: null, before: null, per_page: null, status: null, type: null },
    {
      after: undefined,
      before: undefined,
      per_page: undefined,
      status: undefined,
      type: undefined,
    },
  ] satisfies ListFormsParams[])(
    "omits nullable and undefined form list filters: %j",
    async (params) => {
      const response = { forms: [form], pagination } satisfies ListForms;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.forms.list(params);
      expectTypeOf(result).toEqualTypeOf<ListForms>();
      expectTypeOf(result.forms[0]!).toEqualTypeOf<Form>();
      expectTypeOf<Form>().toEqualTypeOf<{
        id: number;
        name: string;
        created_at: string;
        type: string;
        format: string | null;
        embed_js: string;
        embed_url: string;
        archived: boolean;
        uid: string;
        subscriber_count?: number | undefined;
      }>();
      expect(result).toEqual(response);
      expect(await request("GET", "/forms").text()).toBe("");
    }
  );

  it("preserves subscriber counts and false total counts alongside null filters", async () => {
    const params = {
      after: null,
      before: null,
      per_page: null,
      status: null,
      type: null,
      include: "subscriber_count",
      include_total_count: false,
    } satisfies ListFormsParams;
    const response = {
      forms: [{ ...form, subscriber_count: 0 }],
      pagination,
    } satisfies ListForms;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.forms.list(params)).toEqual(response);
    request("GET", "/forms", {
      include: "subscriber_count",
      include_total_count: "false",
    });
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
      expectTypeOf(result!.subscriber.state).toEqualTypeOf<string>();
      expectTypeOf(result!.subscriber.fields).toEqualTypeOf<
        Record<string, string>
      >();
      expectTypeOf(result!.subscriber.referrer_utm_parameters).toEqualTypeOf<
        FormReferrerUtmParameters | undefined
      >();
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

  it("preserves nullable and string custom-field values in form subscriber lists", async () => {
    const response = {
      subscribers: [
        {
          ...subscriber,
          fields: { category: null, interest: "TypeScript", empty: "" },
        },
      ],
      pagination,
    } satisfies ListFormSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.forms.listSubscribers(7);
    expectTypeOf(result).toEqualTypeOf<ListFormSubscribers | null>();
    expectTypeOf(result!.subscribers[0]!).toEqualTypeOf<FormSubscriber>();
    expectTypeOf<
      NonNullable<typeof result>["subscribers"][number]["fields"]
    >().toEqualTypeOf<Record<string, string | null>>();
    expect(result).toEqual(response);
    expect(await request("GET", "/forms/7/subscribers").text()).toBe("");
  });

  it.each([
    {
      added_after: null,
      added_before: null,
      created_after: null,
      created_before: null,
      after: null,
      before: null,
      per_page: null,
    },
    {
      added_after: undefined,
      added_before: undefined,
      created_after: undefined,
      created_before: undefined,
      after: undefined,
      before: undefined,
      per_page: undefined,
    },
  ] satisfies ListFormSubscribersParams[])(
    "omits nullable and undefined subscriber filters: %j",
    async (params) => {
      const response = {
        subscribers: [subscriber],
        pagination,
      } satisfies ListFormSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.forms.listSubscribers(7, params);
      expectTypeOf(result).toEqualTypeOf<ListFormSubscribers | null>();
      expect(result).toEqual(response);
      expect(await request("GET", "/forms/7/subscribers").text()).toBe("");
    }
  );

  it("preserves slim responses and status and false counts alongside null filters", async () => {
    const slimSubscriber = {
      id: subscriber.id,
      first_name: subscriber.first_name,
      email_address: subscriber.email_address,
      state: subscriber.state,
      created_at: subscriber.created_at,
    };
    const response = {
      subscribers: [slimSubscriber],
      pagination,
    } satisfies ListSlimFormSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const params = {
      slim: true,
      added_after: null,
      added_before: null,
      created_after: null,
      created_before: null,
      after: null,
      before: null,
      per_page: null,
      status: "all",
      include_total_count: false,
    } satisfies ListFormSubscribersParams & { slim: true };
    const result = await kit.forms.listSubscribers(7, params);
    expectTypeOf(result).toEqualTypeOf<ListSlimFormSubscribers | null>();
    expect(result).toEqual(response);
    request("GET", "/forms/7/subscribers", {
      slim: "true",
      status: "all",
      include_total_count: "false",
    });
  });

  it("preserves full responses and explicit false flags alongside null filters", async () => {
    const response = {
      subscribers: [subscriber],
      pagination,
    } satisfies ListFormSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const params = {
      slim: false,
      added_after: null,
      added_before: null,
      created_after: null,
      created_before: null,
      after: null,
      before: null,
      per_page: null,
      status: "active",
      include_total_count: false,
    } satisfies ListFormSubscribersParams & { slim: false };
    const result = await kit.forms.listSubscribers(7, params);
    expectTypeOf(result).toEqualTypeOf<ListFormSubscribers | null>();
    expect(result).toEqual(response);
    request("GET", "/forms/7/subscribers", {
      slim: "false",
      status: "active",
      include_total_count: "false",
    });
  });

  it("requests a slim list with pagination and filters and accepts omitted expensive fields", async () => {
    const response = {
      subscribers: [
        {
          id: 42,
          first_name: null,
          email_address: subscriber.email_address,
          state: "active",
          created_at: subscriber.created_at,
        },
      ],
      pagination,
    } satisfies ListSlimFormSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.forms.listSubscribers(7, {
      slim: true,
      after: "next+/=",
      per_page: 25,
      include_total_count: false,
      status: "all",
      added_after: "2026-01-01",
      created_before: "2026-02-01",
    });
    expectTypeOf(result).toEqualTypeOf<ListSlimFormSubscribers | null>();
    expectTypeOf(result!.subscribers[0]!.fields).toEqualTypeOf<
      Record<string, string | null> | undefined
    >();
    expect(result).toEqual(response);
    request("GET", "/forms/7/subscribers", {
      slim: "true",
      after: "next+/=",
      per_page: "25",
      include_total_count: "false",
      status: "all",
      added_after: "2026-01-01",
      created_before: "2026-02-01",
    });
  });

  it("preserves optional fields when a slim response includes them", async () => {
    const response = {
      subscribers: [subscriber],
      pagination,
    } satisfies ListSlimFormSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.forms.listSubscribers(7, { slim: true })).toEqual(
      response
    );
    request("GET", "/forms/7/subscribers", { slim: "true" });
  });

  it("preserves explicit false and the full response type", async () => {
    const response = {
      subscribers: [subscriber],
      pagination,
    } satisfies ListFormSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.forms.listSubscribers(7, { slim: false });
    expectTypeOf(result).toEqualTypeOf<ListFormSubscribers | null>();
    expectTypeOf(result!.subscribers[0]!.fields).toEqualTypeOf<
      Record<string, string | null>
    >();
    expect(result).toEqual(response);
    request("GET", "/forms/7/subscribers", { slim: "false" });
  });

  it("omits undefined slim and keeps the full response type", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ subscribers: [subscriber], pagination })
    );
    const result = await kit.forms.listSubscribers(7, { slim: undefined });
    expectTypeOf(result).toEqualTypeOf<ListFormSubscribers | null>();
    request("GET", "/forms/7/subscribers");
  });

  it.each([true, false])(
    "supports a dynamic slim boolean: %s",
    async (slim) => {
      const params = { slim } satisfies ListFormSubscribersParams;
      const response = { subscribers: [subscriber], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const result = await kit.forms.listSubscribers(7, params);
      expectTypeOf(result).toEqualTypeOf<
        ListFormSubscribers | ListSlimFormSubscribers | null
      >();
      expect(result).toEqual(response);
      request("GET", "/forms/7/subscribers", { slim: String(slim) });
    }
  );

  it("returns null for a missing form when slim is true", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });
    expect(await kit.forms.listSubscribers(404, { slim: true })).toBeNull();
    request("GET", "/forms/404/subscribers", { slim: "true" });
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
        added_after: "2026-01-01",
        added_before: "2026-02-01",
        created_after: "2026-03-01",
        created_before: "2026-04-01",
      });
    }
  );

  describe.each([
    "added_after",
    "added_before",
    "created_after",
    "created_before",
  ] as const)("form subscriber date filter %s", (field) => {
    it.each([
      {
        name: "positive offset crossing to the previous UTC day",
        value: new Date("2026-01-01T00:30:00+10:30"),
        expected: "2025-12-31",
      },
      {
        name: "negative offset crossing to the next UTC day",
        value: new Date("2026-01-01T23:30:00-08:00"),
        expected: "2026-01-02",
      },
      {
        name: "date string passthrough",
        value: "2026-03-15",
        expected: "2026-03-15",
      },
    ])("formats $name", async ({ value, expected }) => {
      const params = { [field]: value } satisfies ListFormSubscribersParams;
      const response = {
        subscribers: [],
        pagination,
      } satisfies ListFormSubscribers;
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.forms.listSubscribers(7, params)).toEqual(response);
      expect(
        await request("GET", "/forms/7/subscribers", {
          [field]: expected,
        }).text()
      ).toBe("");
    });
  });

  it("adds a subscriber by email without a referrer", async () => {
    const body = { email_address: subscriber.email_address };
    const response = { subscriber };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.forms.addSubscriberByEmail(7, body)).toEqual(response);
    const req = request("POST", "/forms/7/subscribers");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual(body);
  });

  it.each([null, "", undefined])(
    "serializes a defined referrer and omits undefined (%s)",
    async (value) => {
      const body = {
        email_address: subscriber.email_address,
        referrer: value,
      } satisfies AddSubscriberToFormByEmailParams;
      fetchMock.mockResponseOnce(JSON.stringify({ subscriber }));
      await kit.forms.addSubscriberByEmail(7, body);
      const serialized = await request("POST", "/forms/7/subscribers").json();
      expect(serialized).toEqual({
        email_address: subscriber.email_address,
        ...(value !== undefined && { referrer: value }),
      });
      if (value === undefined) {
        expect(serialized).not.toHaveProperty("referrer");
      } else {
        expect(serialized).toHaveProperty("referrer", value);
      }
    }
  );

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
    expectTypeOf(result!.subscriber.fields).toEqualTypeOf<
      Record<string, string>
    >();
    expectTypeOf(result!.subscriber.referrer_utm_parameters).toEqualTypeOf<
      FormReferrerUtmParameters | undefined
    >();
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

  it("preserves null bulk request IDs and nullable failure IDs", async () => {
    const body = {
      additions: [
        { form_id: null, subscriber_id: 42, referrer },
        { form_id: 7, subscriber_id: null },
        { form_id: null, subscriber_id: null },
        { form_id: 7, subscriber_id: 42 },
      ],
    } satisfies BulkAddSubscribersParams;
    const response = {
      subscribers: [subscriber],
      failures: [
        {
          errors: ["Form does not exist"],
          subscription: { form_id: null, subscriber_id: 42, referrer },
        },
        {
          errors: ["Subscriber does not exist"],
          subscription: { form_id: 7, subscriber_id: null, referrer: "" },
        },
        {
          errors: ["Form does not exist", "Subscriber does not exist"],
          subscription: { form_id: null, subscriber_id: null, referrer: "" },
        },
      ],
    } satisfies Omit<BulkAddSubscribersSynchronous, "type">;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.forms.bulkAddSubscribers(body);
    expect(result).toEqual({ type: "synchronous", ...response });
    if (result.type !== "synchronous")
      throw new Error("Expected synchronous response");
    expectTypeOf(result.subscribers[0]!).toEqualTypeOf<{
      id: number;
      first_name: string;
      email_address: string;
      created_at: string;
      added_at: string;
      referrer_utm_parameters?: FormReferrerUtmParameters | undefined;
      referrer?: string | undefined;
    }>();
    expectTypeOf(result.failures[0]!.subscription.form_id).toEqualTypeOf<
      number | null
    >();
    expectTypeOf(result.failures[0]!.subscription.subscriber_id).toEqualTypeOf<
      number | null
    >();
    expect(await request("POST", "/bulk/forms/subscribers").json()).toEqual(
      body
    );
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

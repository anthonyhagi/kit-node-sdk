import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type ApiError,
  type CreateSubscriber,
  type FilterSubscriberBody,
  type FilterSubscriberBodyAllAttribution,
  type FilterSubscriberBodyAllCustomField,
  type FilterSubscriberBodyAllLocation,
  type FilterSubscriberBodyAllState,
  type FilterSubscriberBodyAllTags,
  type FilterSubscriberBodyAnyForms,
  type FilterSubscriberBodyAnyKitSource,
  type FilterSubscriberInclude,
  type FilterSubscriberParams,
  type FilterSubscribers,
  type GetSubscriber,
  type GetSubscriberStats,
  type GetSubscriberStatsParams,
  type ListSubscribers,
  type ListSubscribersParams,
  type PinSubscriberLocation,
  type PinSubscriberLocationParams,
  type UpdateSubscriber,
  type UpdateSubscriberLocation,
  type UpdateSubscriberLocationParams,
} from "~/index";

const subscriber = {
  id: 42,
  first_name: "Ada",
  email_address: "ada+newsletter@example.com",
  state: "active",
  created_at: "2026-01-01T00:00:00Z",
  fields: { interest: "TypeScript" },
} satisfies GetSubscriber["subscriber"];
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
};

const namelessSubscriber = {
  ...subscriber,
  first_name: null,
  fields: { interest: "TypeScript", birthday: null },
};

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

describe("subscriber requests through Kit", () => {
  let kit: Kit;

  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists subscribers without optional query parameters", async () => {
    const response = { subscribers: [subscriber], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.list()).toEqual(response);
    expect(await request("GET", "/subscribers").text()).toBe("");
  });

  it.each([
    { name: "true", params: { slim: true }, query: { slim: "true" } },
    { name: "false", params: { slim: false }, query: { slim: "false" } },
    { name: "omitted", params: {}, query: {} },
    { name: "explicit undefined", params: { slim: undefined }, query: {} },
  ] satisfies {
    name: string;
    params: ListSubscribersParams;
    query: Record<string, string>;
  }[])("lists subscribers with slim $name", async ({ params, query }) => {
    const { fields, ...slimSubscriber } = subscriber;
    const response = {
      subscribers: [
        params.slim ? slimSubscriber : { ...slimSubscriber, fields },
      ],
      pagination,
    } satisfies ListSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.list(params);
    expectTypeOf(result).toEqualTypeOf<ListSubscribers>();
    expectTypeOf(result.subscribers[0]?.fields).toEqualTypeOf<
      Record<string, string | null> | undefined
    >();
    expect(result).toEqual(response);
    expect(await request("GET", "/subscribers", query).text()).toBe("");
  });

  it("combines slim with subscriber list filters and pagination", async () => {
    const params = {
      slim: true,
      status: "inactive",
      per_page: 25,
      after: "next+/=",
    } satisfies ListSubscribersParams;
    const response = { subscribers: [], pagination } satisfies ListSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.list(params)).toEqual(response);
    request("GET", "/subscribers", {
      slim: "true",
      status: "inactive",
      per_page: "25",
      after: "next+/=",
    });
  });

  it.each(["after", "before"] as const)(
    "encodes the %s cursor and list filters, normalizing Date values",
    async (cursor) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ subscribers: [], pagination })
      );
      await kit.subscribers.list({
        [cursor]: "next+/=",
        created_after: new Date("2026-01-01T00:00:00Z"),
        created_before: "2026-02-01T00:00:00Z",
        updated_after: "2026-03-01T00:00:00Z",
        updated_before: new Date("2026-04-01T00:00:00Z"),
        email_address: "ada+newsletter@example.com",
        include_total_count: true,
        per_page: 25,
        sort_field: "updated_at",
        sort_order: "desc",
        status: "all",
      });

      request("GET", "/subscribers", {
        [cursor]: "next+/=",
        created_after: "2026-01-01T00:00:00.000Z",
        created_before: "2026-02-01T00:00:00Z",
        updated_after: "2026-03-01T00:00:00Z",
        updated_before: "2026-04-01T00:00:00.000Z",
        email_address: "ada+newsletter@example.com",
        include_total_count: "true",
        per_page: "25",
        sort_field: "updated_at",
        sort_order: "desc",
        status: "all",
      });
    }
  );

  it("creates a subscriber with fields and explicit null values", async () => {
    const body = {
      email_address: subscriber.email_address,
      first_name: null,
      state: null,
      fields: subscriber.fields,
    };
    const response = { subscriber };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.create(body)).toEqual(response);
    const req = request("POST", "/subscribers");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(await req.json()).toEqual(body);
  });

  it("gets a subscriber by ID", async () => {
    const response = { subscriber };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.get(42)).toEqual(response);
    expect(await request("GET", "/subscribers/42").text()).toBe("");
  });

  it.each([
    {
      name: "a populated primary location and cancellation timestamp",
      details: {
        canceled_at: "2026-05-01T00:00:00Z",
        location: {
          city: "Williamstown",
          state: "Massachusetts",
          country: "US",
          latitude: 9.99,
          longitude: 9.99,
          timezone: "US/EST",
        },
      },
    },
    {
      name: "undetermined location fields and no cancellation",
      details: {
        canceled_at: null,
        location: {
          city: null,
          state: null,
          country: null,
          latitude: null,
          longitude: null,
          timezone: null,
        },
      },
    },
    {
      name: "zero coordinates with other location fields omitted",
      details: { location: { latitude: 0, longitude: 0 } },
    },
    { name: "optional details omitted", details: {} },
  ] satisfies {
    name: string;
    details: Partial<GetSubscriber["subscriber"]>;
  }[])("gets a subscriber with $name", async ({ details }) => {
    const response = {
      subscriber: { ...subscriber, ...details },
    } satisfies GetSubscriber;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.get(42);
    expectTypeOf(result).toEqualTypeOf<GetSubscriber | null>();
    expectTypeOf(result?.subscriber.canceled_at).toEqualTypeOf<
      string | null | undefined
    >();
    expectTypeOf(result?.subscriber.location?.latitude).toEqualTypeOf<
      number | null | undefined
    >();
    expect(result).toEqual(response);
    expect(await request("GET", "/subscribers/42").text()).toBe("");
  });

  it("lists subscribers with null names and unset custom fields", async () => {
    const response = {
      subscribers: [namelessSubscriber],
      pagination,
    } satisfies ListSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.list();
    expectTypeOf(result).toEqualTypeOf<ListSubscribers>();
    expect(result).toEqual(response);
    request("GET", "/subscribers");
  });

  it("gets a subscriber with a null name and unset custom fields", async () => {
    const response = { subscriber: namelessSubscriber } satisfies GetSubscriber;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.get(42);
    expectTypeOf(result).toEqualTypeOf<GetSubscriber | null>();
    expect(result).toEqual(response);
    request("GET", "/subscribers/42");
  });

  it("creates a subscriber with a null name and unset custom fields in the response", async () => {
    const body = { email_address: subscriber.email_address, first_name: null };
    const response = {
      subscriber: namelessSubscriber,
    } satisfies CreateSubscriber;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.create(body);
    expectTypeOf(result).toEqualTypeOf<CreateSubscriber>();
    expect(result).toEqual(response);
    expect(await request("POST", "/subscribers").json()).toEqual(body);
  });

  it("updates a subscriber with a null name and unset custom fields in the response", async () => {
    const body = { email_address: subscriber.email_address, first_name: null };
    const response = {
      subscriber: namelessSubscriber,
    } satisfies UpdateSubscriber;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.update(42, body);
    expectTypeOf(result).toEqualTypeOf<UpdateSubscriber | null>();
    expect(result).toEqual(response);
    expect(await request("PUT", "/subscribers/42").json()).toEqual(body);
  });

  it("updates a subscriber using PUT with the ID only in the path", async () => {
    const body = {
      email_address: "updated@example.com",
      first_name: null,
      fields: null,
    };
    const response = {
      subscriber: { ...subscriber, first_name: null },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.update(42, body)).toEqual(response);
    expect(await request("PUT", "/subscribers/42").json()).toEqual(body);
  });

  it("unsubscribes with a bodyless POST and handles a 204 response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    expect(await kit.subscribers.unsubscribe(42)).toEqual({});
    expect(await request("POST", "/subscribers/42/unsubscribe").text()).toBe(
      ""
    );
  });

  const pinnedLocation = {
    location: {
      city: "Boise",
      state_province: "Idaho",
      country_code: "US",
      latitude: 43.62,
      longitude: -116.2,
      timezone: "America/Denver",
    },
  } satisfies PinSubscriberLocationParams;

  it.each([
    pinnedLocation,
    { location: { ...pinnedLocation.location, latitude: 0, longitude: 0 } },
  ] satisfies PinSubscriberLocationParams[])(
    "pins subscriber location %j",
    async (body) => {
      const response = {
        subscriber: { id: 42, location: body.location },
      } satisfies PinSubscriberLocation;
      fetchMock.mockResponseOnce(JSON.stringify(response));

      const result = await kit.subscribers.pinLocation(42, body);
      expectTypeOf(result).toEqualTypeOf<PinSubscriberLocation | null>();
      expect(result).toEqual(response);
      expect(await request("POST", "/subscribers/42/location").json()).toEqual(
        body
      );
    }
  );

  it("returns null when pinning a missing subscriber's location", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });

    expect(await kit.subscribers.pinLocation(42, pinnedLocation)).toBeNull();
    expect(await request("POST", "/subscribers/42/location").json()).toEqual(
      pinnedLocation
    );
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it.each([401, 422])(
    "preserves location API errors with status %s",
    async (status) => {
      const details = {
        errors: [
          status === 422
            ? "Country code is invalid"
            : "The access token is invalid",
        ],
      };
      fetchMock.mockResponseOnce(JSON.stringify(details), { status });

      await expect(
        kit.subscribers.pinLocation(42, pinnedLocation)
      ).rejects.toMatchObject({
        name: "ApiError",
        status,
        details,
      } satisfies Partial<ApiError>);
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it.each([
    pinnedLocation,
    { location: { ...pinnedLocation.location, latitude: 0, longitude: 0 } },
  ] satisfies UpdateSubscriberLocationParams[])(
    "updates the complete pinned location %j",
    async (body) => {
      const response = {
        subscriber: { id: 42, location: body.location },
      } satisfies UpdateSubscriberLocation;
      fetchMock.mockResponseOnce(JSON.stringify(response));

      const result = await kit.subscribers.updateLocation(42, body);
      expectTypeOf(result).toEqualTypeOf<UpdateSubscriberLocation | null>();
      expect(result).toEqual(response);
      expect(await request("PATCH", "/subscribers/42/location").json()).toEqual(
        body
      );
    }
  );

  it("requires all six fields for a location replacement", () => {
    type Location = UpdateSubscriberLocationParams["location"];
    expectTypeOf<Omit<Location, "city">>().not.toExtend<Location>();
    expectTypeOf<Omit<Location, "state_province">>().not.toExtend<Location>();
    expectTypeOf<Omit<Location, "country_code">>().not.toExtend<Location>();
    expectTypeOf<Omit<Location, "latitude">>().not.toExtend<Location>();
    expectTypeOf<Omit<Location, "longitude">>().not.toExtend<Location>();
    expectTypeOf<Omit<Location, "timezone">>().not.toExtend<Location>();
  });

  it("returns null when updating a missing subscriber's location", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });

    expect(await kit.subscribers.updateLocation(42, pinnedLocation)).toBeNull();
    expect(await request("PATCH", "/subscribers/42/location").json()).toEqual(
      pinnedLocation
    );
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it.each([401, 422])(
    "preserves location update errors with status %s",
    async (status) => {
      const details = {
        errors: [
          status === 422
            ? "Country code is invalid"
            : "The access token is invalid",
        ],
      };
      fetchMock.mockResponseOnce(JSON.stringify(details), { status });

      await expect(
        kit.subscribers.updateLocation(42, pinnedLocation)
      ).rejects.toMatchObject({
        name: "ApiError",
        status,
        details,
      } satisfies Partial<ApiError>);
      expect(await request("PATCH", "/subscribers/42/location").json()).toEqual(
        pinnedLocation
      );
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("deletes a pinned location with a bodyless DELETE and handles 204", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await kit.subscribers.deleteLocation(42);
    expectTypeOf(result).toEqualTypeOf<{} | null>();
    expect(result).toEqual({});
    expect(await request("DELETE", "/subscribers/42/location").text()).toBe("");
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("returns null when deleting a missing subscriber's location", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not Found"] }), {
      status: 404,
    });

    expect(await kit.subscribers.deleteLocation(42)).toBeNull();
    expect(await request("DELETE", "/subscribers/42/location").text()).toBe("");
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("preserves authentication errors when deleting a location", async () => {
    const details = { errors: ["The access token is invalid"] };
    fetchMock.mockResponseOnce(JSON.stringify(details), { status: 401 });

    await expect(kit.subscribers.deleteLocation(42)).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      details,
    } satisfies Partial<ApiError>);
    expect(await request("DELETE", "/subscribers/42/location").text()).toBe("");
    expect(fetchMock.requests()).toHaveLength(1);
  });

  const filterBody: FilterSubscriberBody = {
    all: [
      { type: "subscribed", after: "2026-01-01", before: "2026-02-01" },
      {
        type: "clicks",
        count_greater_than: 0,
        any: [
          {
            type: "urls",
            ids: [7, 8],
            urls: ["kit.com"],
            matching: "contains",
          },
        ],
      },
    ],
  };

  it("filters using a nested JSON body without optional pagination", async () => {
    const response = {
      subscribers: [
        {
          id: "42",
          first_name: "Ada",
          email_address: "ada@example.com",
          created_at: "2026-01-01T00:00:00Z",
          tag_names: ["Newsletter"],
          tag_ids: ["7"],
        },
        {
          id: "43",
          first_name: null,
          email_address: "anonymous@example.com",
          created_at: "2026-01-02T00:00:00Z",
          tag_names: [],
          tag_ids: [],
        },
      ],
      pagination: { ...pagination, total_count: 2 },
    } satisfies FilterSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.filter(filterBody);
    expectTypeOf(result).toEqualTypeOf<FilterSubscribers>();
    expect(result).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(
      filterBody
    );
  });

  it("filters engagement by broadcast IDs using the API's plural discriminator", async () => {
    const body: FilterSubscriberBody = {
      all: [
        {
          type: "clicks",
          count_greater_than: 2,
          any: [{ type: "broadcasts", ids: [7, 8] }],
        },
      ],
    };
    const response = { subscribers: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.filter(body)).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  it("filters clicks by URL patterns without requiring URL IDs", async () => {
    const body = {
      all: [
        {
          type: "clicks",
          count_greater_than: 2,
          any: [
            {
              type: "urls",
              urls: ["kit.com", "amazon.com"],
              matching: "contains",
            },
          ],
        },
      ],
    } satisfies FilterSubscriberBody;
    const response = { subscribers: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.filter(body)).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  it.each([
    { sort_field: "id", sort_order: "asc" },
    { sort_field: "first_name", sort_order: "desc" },
    { sort_field: "email_address", sort_order: "asc" },
    { sort_field: "created_at", sort_order: "desc" },
    { sort_field: "engagement__sent", sort_order: "asc" },
    { sort_field: "engagement__opens", sort_order: "desc" },
    { sort_field: "engagement__clicks", sort_order: "asc" },
    { sort_field: "engagement__open_rate", sort_order: "desc" },
    { sort_field: "engagement__click_rate", sort_order: "asc" },
  ] as const)(
    "sorts filtered subscribers by $sort_field $sort_order",
    async (sorting) => {
      const body = { ...filterBody, ...sorting } satisfies FilterSubscriberBody;
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  it("accepts a sort field or direction independently", async () => {
    const body = {
      ...filterBody,
      sort_field: "created_at",
    } satisfies FilterSubscriberBody;
    const directionOnly = {
      ...filterBody,
      sort_order: "asc",
    } satisfies FilterSubscriberBody;
    expectTypeOf(directionOnly).toExtend<FilterSubscriberBody>();
    const response = { subscribers: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.filter(body)).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  it.each(["raw", "unique_email"] as const)(
    "sends the %s engagement counting mode in the filter body",
    async (counting_mode) => {
      const body = {
        all: [{ type: "opens", count_greater_than: 5 }],
        counting_mode,
      } satisfies FilterSubscriberBody;
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  it.each([
    { type: "opens", count_greater_than_or_equal: 5 },
    { type: "clicks", count_less_than_or_equal: 0 },
    {
      type: "sent",
      count_greater_than_or_equal: 0,
      count_less_than_or_equal: 10,
    },
    {
      type: "delivered",
      count_greater_than: 2,
      count_less_than_or_equal: 10,
    },
  ] satisfies FilterSubscriberBody["all"])(
    "sends inclusive count thresholds for $type",
    async (condition) => {
      const body = { all: [condition] } satisfies FilterSubscriberBody;
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  it.each([
    { type: "attribution" },
    { type: "tags" },
    { type: "location" },
    { type: "canceled_at" },
    { type: "custom_fields" },
    { type: "stats" },
    { type: "stats", range: {} },
    { type: "stats", range: { start: "2026-05-01" } },
    { type: "stats", range: { end: "2026-06-30" } },
    { type: "stats", range: { start: "2026-05-01", end: "2026-06-30" } },
  ] satisfies FilterSubscriberInclude[])(
    "sends filter include %j",
    async (include) => {
      const body = {
        ...filterBody,
        include: [include],
      } satisfies FilterSubscriberBody;
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  it("returns typed embedded subscriber fields with nullable and absent values", async () => {
    const body = {
      ...filterBody,
      include: [
        { type: "attribution" },
        { type: "tags" },
        { type: "location" },
        { type: "canceled_at" },
        { type: "stats" },
        { type: "custom_fields" },
      ],
    } satisfies FilterSubscriberBody;
    const base = {
      id: "42",
      first_name: "Ada",
      email_address: "ada@example.com",
      created_at: "2026-01-01T00:00:00Z",
    };
    const response = {
      subscribers: [
        {
          ...base,
          attribution: {
            referrer: "https://example.com",
            utm_source: "newsletter",
            utm_medium: null,
            utm_campaign: "launch",
            utm_term: null,
            utm_content: null,
            source_type: "api_subscription",
            source_name: "Welcome",
            source_mechanism: "import",
            source_mechanism_id: 9,
          },
          tags: [{ id: 123, name: "Newsletter" }],
          location: {
            city: "Adelaide",
            state: null,
            country: "Australia",
            latitude: -34.9285,
            longitude: 138.6007,
            timezone: "Australia/Adelaide",
          },
          canceled_at: "2026-05-01T00:00:00Z",
          stats: {
            sent: 10,
            opened: 5,
            clicked: 2,
            bounced: 0,
            open_rate: 0.5,
            click_rate: 0.2,
            last_sent: "2026-05-01T00:00:00Z",
            last_opened: "2026-05-01T00:01:00Z",
            last_clicked: "2026-05-01T00:02:00Z",
            sends_since_last_open: 0,
            sends_since_last_click: 0,
          },
          fields: { interest: "TypeScript", company: null },
        },
        {
          ...base,
          id: "43",
          attribution: null,
          location: null,
          tags: [],
          canceled_at: null,
          fields: {},
          stats: {
            sent: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            open_rate: 0,
            click_rate: 0,
            last_sent: null,
            last_opened: null,
            last_clicked: null,
            sends_since_last_open: 0,
            sends_since_last_click: 0,
          },
        },
        { ...base, id: "44" },
        {
          ...base,
          id: "45",
          attribution: {},
          location: {},
          stats: {},
          tags: [{}],
        },
      ],
      pagination,
    } satisfies FilterSubscribers;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.filter(body);
    expectTypeOf(result).toEqualTypeOf<FilterSubscribers>();
    expect(result).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  const locationCondition = {
    type: "location",
    latitude: -34.9285,
    longitude: 138.6007,
    radius: 25,
  } satisfies FilterSubscriberBodyAllLocation;

  it.each([
    { name: "location alone", body: { all: [locationCondition] } },
    {
      name: "location combined with engagement",
      body: {
        all: [locationCondition, { type: "opens", count_greater_than: 5 }],
      },
    },
    {
      name: "nearest location first",
      body: { all: [locationCondition], sort_field: "location__distance" },
    },
    {
      name: "farthest location first",
      body: {
        all: [locationCondition],
        sort_field: "location__distance",
        sort_order: "desc",
      },
    },
  ] satisfies { name: string; body: FilterSubscriberBody }[])(
    "filters by $name",
    async ({ body }) => {
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  it("preserves zero coordinates in location conditions", async () => {
    const body = {
      all: [{ type: "location", latitude: 0, longitude: 0, radius: 10 }],
    } satisfies FilterSubscriberBody;
    fetchMock.mockResponseOnce(JSON.stringify({ subscribers: [], pagination }));

    await kit.subscribers.filter(body);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  const customFieldCondition = {
    type: "custom_field",
    subscriber_custom_field_id: 42,
    value: "premium",
    comparison: "is",
  } satisfies FilterSubscriberBodyAllCustomField;

  it.each([
    { name: "custom fields alone", body: { all: [customFieldCondition] } },
    {
      name: "custom fields combined with engagement and tags",
      body: {
        all: [
          customFieldCondition,
          { type: "opens", count_greater_than: 5 },
          { type: "tags", any: [{ type: "ids", matching: [123] }] },
        ],
      },
    },
  ] satisfies { name: string; body: FilterSubscriberBody }[])(
    "filters by $name",
    async ({ body }) => {
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  it.each([
    { comparison: "contains", value: "premium" },
    { comparison: "greater_than", value: "10" },
    { comparison: "greater_than_or_equal", value: "10" },
    { comparison: "less_than", value: "10" },
    { comparison: "less_than_or_equal", value: "10" },
    { comparison: "has_value" },
  ] as const)("filters custom fields using $comparison", async (comparison) => {
    const condition = {
      type: "custom_field",
      subscriber_custom_field_id: 42,
      ...comparison,
    } satisfies FilterSubscriberBodyAllCustomField;
    const body = { all: [condition] } satisfies FilterSubscriberBody;
    const response = { subscribers: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.filter(body)).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  it.each([
    "active",
    "inactive",
    "bounced",
    "cancelled",
    "complained",
  ] as const)(
    "filters subscribers by the %s lifecycle state",
    async (state) => {
      const condition = {
        type: "subscriber_state",
        states: [state],
      } satisfies FilterSubscriberBodyAllState;
      const body = { all: [condition] } satisfies FilterSubscriberBody;
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  const stateCondition = {
    type: "subscriber_state",
    states: ["active", "inactive"],
  } satisfies FilterSubscriberBodyAllState;

  it.each([
    { name: "multiple lifecycle states", body: { all: [stateCondition] } },
    {
      name: "lifecycle states combined with engagement",
      body: {
        all: [stateCondition, { type: "opens", count_greater_than: 5 }],
      },
    },
  ] satisfies { name: string; body: FilterSubscriberBody }[])(
    "filters by $name",
    async ({ body }) => {
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  const formAttribution = {
    type: "forms",
    ids: [789, 1001],
  } satisfies FilterSubscriberBodyAnyForms;
  const kitSourceAttribution = {
    type: "kit_source",
    source_type: "api_subscription",
    source_ids: [555, 556],
    source_names: ["Welcome", "Import"],
    mechanism: "import",
    mechanism_ids: [9, 10],
  } satisfies FilterSubscriberBodyAnyKitSource;
  const attributionCondition = {
    type: "attribution",
    any: [formAttribution, kitSourceAttribution],
  } satisfies FilterSubscriberBodyAllAttribution;

  it.each([
    {
      name: "signup forms",
      body: { all: [{ type: "attribution", any: [formAttribution] }] },
    },
    {
      name: "all Kit source fields",
      body: { all: [{ type: "attribution", any: [kitSourceAttribution] }] },
    },
    {
      name: "alternative attribution sources",
      body: { all: [attributionCondition] },
    },
    {
      name: "attribution combined with engagement and lifecycle state",
      body: {
        all: [
          attributionCondition,
          { type: "opens", count_greater_than: 5 },
          { type: "subscriber_state", states: ["active"] },
        ],
      },
    },
  ] satisfies { name: string; body: FilterSubscriberBody }[])(
    "filters by $name",
    async ({ body }) => {
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  it.each([
    {},
    { source_type: "manual" },
    { source_ids: [555] },
    { source_names: ["Welcome"] },
    { mechanism: "import" },
    { mechanism_ids: [9] },
  ])("allows independent Kit source constraints %j", async (constraints) => {
    const source = {
      type: "kit_source",
      ...constraints,
    } satisfies FilterSubscriberBodyAnyKitSource;
    const body = {
      all: [{ type: "attribution", any: [source] }],
    } satisfies FilterSubscriberBody;
    const response = { subscribers: [], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.filter(body)).toEqual(response);
    expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
  });

  const tagCondition: FilterSubscriberBodyAllTags = {
    type: "tags",
    any: [{ type: "ids", matching: [123, 456] }],
  };

  it.each([
    { name: "tags alone", body: { all: [tagCondition] } },
    {
      name: "tags combined with engagement and sign-up dates",
      body: {
        all: [
          tagCondition,
          { type: "opens", count_greater_than: 5 },
          { type: "subscribed", after: "2026-01-01" },
        ],
      },
    },
  ] satisfies { name: string; body: FilterSubscriberBody }[])(
    "filters by $name",
    async ({ body }) => {
      const response = { subscribers: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(await kit.subscribers.filter(body)).toEqual(response);
      expect(await request("POST", "/subscribers/filter").json()).toEqual(body);
    }
  );

  it.each(["after", "before"] as const)(
    "paginates filter results with %s",
    async (cursor) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ subscribers: [], pagination })
      );
      const params: FilterSubscriberParams = {
        [cursor]: "next+/=",
        per_page: 25,
        include_total_count: true,
      };
      // This is the API filter endpoint, not Array.prototype.filter.
      // eslint-disable-next-line unicorn/no-array-method-this-argument
      await kit.subscribers.filter(filterBody, params);

      const req = request("POST", "/subscribers/filter", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
      });
      expect(await req.json()).toEqual(filterBody);
    }
  );

  it("gets stats with sent-date filters", async () => {
    const response = {
      subscriber: {
        id: 42,
        stats: {
          sent: 10,
          opened: 5,
          clicked: 2,
          bounced: 0,
          open_rate: 0.5,
          click_rate: 0.2,
          last_sent: "2026-01-31T12:00:00Z",
          last_opened: "2026-01-31T12:01:00Z",
          last_clicked: "2026-01-31T12:02:00Z",
          sends_since_last_open: 0,
          sends_since_last_click: 0,
        },
      },
    } satisfies GetSubscriberStats;
    const params = {
      email_sent_after: "2026-01-01",
      email_sent_before: "2026-02-01",
    } satisfies GetSubscriberStatsParams;
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await kit.subscribers.getStats(42, params);
    expectTypeOf(result).toEqualTypeOf<GetSubscriberStats | null>();
    expect(result).toEqual(response);
    request("GET", "/subscribers/42/stats", {
      email_sent_after: "2026-01-01",
      email_sent_before: "2026-02-01",
    });
  });

  it("gets stats without optional filters", async () => {
    fetchMock.mockResponseOnce("{}");
    await kit.subscribers.getStats(42);
    request("GET", "/subscribers/42/stats");
  });

  it.each(["after", "before"] as const)(
    "paginates subscriber tags with %s",
    async (cursor) => {
      const response = { tags: [{ id: 7, name: "Newsletter" }], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));

      expect(
        await kit.subscribers.getTags(42, {
          [cursor]: "next+/=",
          per_page: 25,
          include_total_count: true,
        })
      ).toEqual(response);
      request("GET", "/subscribers/42/tags", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
      });
    }
  );

  it("gets subscriber tags without optional pagination", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ tags: [], pagination }));
    await kit.subscribers.getTags(42);
    request("GET", "/subscribers/42/tags");
  });

  it("bulk creates subscribers and marks a synchronous response", async () => {
    const body = {
      subscribers: [
        {
          first_name: "Ada",
          email_address: subscriber.email_address,
          state: "active" as const,
        },
      ],
    };
    const response = { subscribers: [subscriber], failures: [] };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    expect(await kit.subscribers.bulkCreate(body)).toEqual({
      type: "synchronous",
      ...response,
    });
    expect(await request("POST", "/bulk/subscribers").json()).toEqual(body);
  });

  it("preserves the bulk callback URL and marks an empty async response", async () => {
    const body = {
      subscribers: Array.from({ length: 101 }, (_, i) => ({
        first_name: "Ada",
        email_address: `ada${i}@example.com`,
        state: "active" as const,
      })),
      callback_url: "https://example.com/hooks/kit?source=bulk",
    };
    fetchMock.mockResponseOnce("", { status: 202 });

    expect(await kit.subscribers.bulkCreate(body)).toEqual({
      type: "asynchronous",
    });
    expect(await request("POST", "/bulk/subscribers").json()).toEqual(body);
  });

  it.each(["get", "update", "unsubscribe", "getStats", "getTags"] as const)(
    "returns null from %s when the subscriber is missing",
    async (method) => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ errors: ["Subscriber not found"] }),
        { status: 404 }
      );
      const result =
        method === "update"
          ? await kit.subscribers.update(42, {
              email_address: subscriber.email_address,
            })
          : await kit.subscribers[method](42);
      expect(result).toBeNull();
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );
});

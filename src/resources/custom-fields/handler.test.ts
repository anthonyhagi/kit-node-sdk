import { beforeEach, describe, expect, it } from "vitest";
import { Kit } from "~/index";

const field = {
  id: 7,
  label: "Last name",
  key: "last_name",
  name: "ck_field_7_last_name",
  created_at: "2026-01-01T00:00:00Z",
};
const pagination = {
  has_previous_page: false,
  has_next_page: true,
  start_cursor: "start",
  end_cursor: "next+/=",
  per_page: 25,
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

describe("custom-field requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
  });

  it("lists custom fields without optional pagination", async () => {
    const response = { custom_fields: [field], pagination };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.customFields.list()).toEqual(response);
    expect(await request("GET", "/custom_fields").text()).toBe("");
  });

  it.each(["after", "before"] as const)(
    "encodes the %s cursor and pagination options",
    async (cursor) => {
      const response = { custom_fields: [], pagination };
      fetchMock.mockResponseOnce(JSON.stringify(response));
      expect(
        await kit.customFields.list({
          [cursor]: "next+/=",
          per_page: 25,
          include_total_count: true,
        })
      ).toEqual(response);
      request("GET", "/custom_fields", {
        [cursor]: "next+/=",
        per_page: "25",
        include_total_count: "true",
      });
    }
  );

  it.each([200, 201])(
    "creates a field with a JSON label on status %i",
    async (status) => {
      const body = { label: "  Café & interests ✨  " };
      const response = {
        custom_field: {
          ...field,
          label: "Café & interests ✨",
          key: "cafe_interests",
        },
      };
      fetchMock.mockResponseOnce(JSON.stringify(response), { status });
      expect(await kit.customFields.create(body)).toEqual(response);
      const req = request("POST", "/custom_fields");
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(await req.json()).toEqual(body);
    }
  );

  it("updates the label by ID and preserves the returned name and new key", async () => {
    const body = { label: "Family name" };
    const response = {
      custom_field: { ...field, ...body, key: "family_name" },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.customFields.update(7, body)).toEqual(response);
    expect(await request("PUT", "/custom_fields/7").json()).toEqual(body);
  });

  it("deletes by ID with a bodyless DELETE and handles a 204 response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await kit.customFields.delete(7)).toEqual({});
    expect(await request("DELETE", "/custom_fields/7").text()).toBe("");
  });

  it.each(["update", "delete"] as const)(
    "returns null from %s when the custom field is missing",
    async (method) => {
      fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Not found"] }), {
        status: 404,
      });
      const result =
        method === "update"
          ? await kit.customFields.update(7, { label: "Family name" })
          : await kit.customFields.delete(7);
      expect(result).toBeNull();
      request(method === "update" ? "PUT" : "DELETE", "/custom_fields/7");
    }
  );

  it("bulk creates fields with OAuth and preserves mixed results", async () => {
    kit = new Kit({ apiKey: "oauth-token", authType: "oauth", maxRetries: 0 });
    const body = {
      custom_fields: [{ label: "Last name" }, { label: "" }],
      callback_url: null,
    };
    const response = {
      custom_fields: [field],
      failures: [
        { custom_field: { label: "" }, errors: ["Label cannot be blank"] },
      ],
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.customFields.bulkCreate(body)).toEqual({
      type: "synchronous",
      ...response,
    });
    const req = request("POST", "/bulk/custom_fields");
    expect(req.headers.get("Authorization")).toBe("Bearer oauth-token");
    expect(await req.json()).toEqual(body);
  });

  it("recognizes an empty custom_fields array as a synchronous bulk response", async () => {
    const body = { custom_fields: [{ label: "Last name" }] };
    const response = { custom_fields: [], failures: [] };
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.customFields.bulkCreate(body)).toEqual({
      type: "synchronous",
      ...response,
    });
    expect(await request("POST", "/bulk/custom_fields").json()).toEqual(body);
  });

  it.each(["{}", ""])(
    "handles an asynchronous bulk body %j and preserves callback URL",
    async (responseBody) => {
      const body = {
        custom_fields: Array.from({ length: 101 }, (_, i) => ({
          label: `Field ${i}`,
        })),
        callback_url: "https://example.com/hooks/kit?source=fields",
      };
      fetchMock.mockResponseOnce(responseBody, { status: 202 });
      expect(await kit.customFields.bulkCreate(body)).toEqual({
        type: "asynchronous",
      });
      expect(await request("POST", "/bulk/custom_fields").json()).toEqual(body);
    }
  );

  it("surfaces API validation errors without repeating creation", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ errors: ["Label has already been taken"] }),
      { status: 422 }
    );
    await expect(
      kit.customFields.create({ label: "Last name" })
    ).rejects.toThrow("Label has already been taken");
    expect(await request("POST", "/custom_fields").json()).toEqual({
      label: "Last name",
    });
  });
});

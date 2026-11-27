import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  ApiError,
  Kit,
  type KitField,
  type KitFieldDataType,
  type KitFieldValue,
  type ListKitFields,
  type UpdateSubscriberKitFields,
  type UpdateSubscriberKitFieldsParams,
} from "~/index";

const response = {
  kit_fields: [
    { name: "age", data_type: "Integer" },
    {
      name: "gender",
      data_type: "String",
      available_options: ["male", "female"],
    },
    { name: "future_field", data_type: "Duration" },
  ],
} satisfies ListKitFields;

describe("Kit Fields requests through Kit", () => {
  let kit: Kit;
  beforeEach(() => {
    fetchMock.resetMocks();
    kit = new Kit({ apiKey: "test-key", maxRetries: 2, retryDelay: 0 });
  });

  it("lists field definitions with a bodyless GET", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const result = await kit.kitFields.list();
    expectTypeOf(result).toEqualTypeOf<ListKitFields>();
    expect(result).toEqual(response);
    const req = fetchMock.requests()[0]!;
    expect(req.method).toBe("GET");
    expect(req.url).toBe("https://api.kit.com/v4/kit_fields");
    expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
    expect(req.body).toBeNull();
  });

  it("keeps available_options only where Kit sends them", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const [age, gender] = (await kit.kitFields.list()).kit_fields;
    expect(age).not.toHaveProperty("available_options");
    expect(gender!.available_options).toEqual(["male", "female"]);
    expectTypeOf<KitField["available_options"]>().toEqualTypeOf<
      string[] | undefined
    >();
    expectTypeOf<"DateTime">().toExtend<KitFieldDataType>();
  });

  it("uses OAuth bearer tokens", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ kit_fields: [] }));
    const oauth = new Kit({
      apiKey: "oauth-token",
      authType: "oauth",
      maxRetries: 0,
    });
    expect(await oauth.kitFields.list()).toEqual({ kit_fields: [] });
    expect(fetchMock.requests()[0]!.headers.get("Authorization")).toBe(
      "Bearer oauth-token"
    );
  });

  it.each([
    { status: 401, errors: ["The access token is invalid"] },
    {
      status: 422,
      errors: ["Upgrade to pro to enable signals on your account."],
    },
  ])("throws $status with details and no retry", async ({ status, errors }) => {
    fetchMock.mockResponseOnce(JSON.stringify({ errors }), { status });
    const result = kit.kitFields.list();
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ status, details: { errors } });
    expect(fetchMock.requests()).toHaveLength(1);
  });

  describe("updateSubscriberValues", () => {
    const updated = {
      subscriber: { id: 130, kit_fields: { age: 34, gender: "female" } },
    } satisfies UpdateSubscriberKitFields;

    it("PATCHes the subscriber's kit_fields with a JSON body", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(updated));
      const params = {
        kit_fields: {
          gender: "female",
          age: 34,
          opted_in: true,
          job_title: null,
        },
      } satisfies UpdateSubscriberKitFieldsParams;
      const result = await kit.kitFields.updateSubscriberValues(130, params);
      expectTypeOf(result).toEqualTypeOf<UpdateSubscriberKitFields>();
      expect(result).toEqual(updated);
      const req = fetchMock.requests()[0]!;
      expect(req.method).toBe("PATCH");
      expect(req.url).toBe("https://api.kit.com/v4/subscribers/130/kit_fields");
      expect(req.headers.get("Content-Type")).toBe("application/json");
      expect(await req.json()).toEqual(params);
    });

    it("types values as strings, numbers, booleans or null", () => {
      expectTypeOf<KitFieldValue>().toEqualTypeOf<string | number | boolean>();
      expectTypeOf<
        UpdateSubscriberKitFieldsParams["kit_fields"][string]
      >().toEqualTypeOf<KitFieldValue | null>();
      expectTypeOf<
        UpdateSubscriberKitFields["subscriber"]["kit_fields"][string]
      >().toEqualTypeOf<KitFieldValue>();
    });

    it("throws 422 for a value that doesn't fit its field, without retrying", async () => {
      const errors = ["household_income must be one of: Under $10,000"];
      fetchMock.mockResponseOnce(JSON.stringify({ errors }), { status: 422 });
      const result = kit.kitFields.updateSubscriberValues(130, {
        kit_fields: { household_income: "lots" },
      });
      await expect(result).rejects.toBeInstanceOf(ApiError);
      await expect(result).rejects.toMatchObject({
        status: 422,
        details: { errors },
      });
      expect(fetchMock.requests()).toHaveLength(1);
    });
  });
});

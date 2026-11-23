import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  ApiError,
  Kit,
  type KitField,
  type KitFieldDataType,
  type ListKitFields,
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
});

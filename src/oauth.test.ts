import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  ApiError,
  revokeOAuthToken,
  type RevokeOAuthTokenParams,
} from "~/index";

const credentials = {
  token: "token+with&reserved=characters /",
  client_id: "client+id",
  client_secret: "secret&value= /",
} satisfies RevokeOAuthTokenParams;

describe("OAuth token revocation", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each([undefined, "access_token", "refresh_token"] as const)(
    "sends form-encoded credentials with hint %s and accepts an empty 200",
    async (token_type_hint) => {
      fetchMock.mockResponseOnce("", { status: 200 });
      const result = await revokeOAuthToken({
        ...credentials,
        token_type_hint,
      });
      expectTypeOf(result).toEqualTypeOf<void>();
      expect(result).toBeUndefined();
      const requests = fetchMock.requests();
      expect(requests).toHaveLength(1);
      const request = requests[0]!;
      expect(request.url).toBe("https://api.kit.com/v4/oauth/revoke");
      expect(request.method).toBe("POST");
      expect(request.headers.get("Content-Type")).toBe(
        "application/x-www-form-urlencoded"
      );
      expect(request.headers.get("Accept")).toBe("application/json");
      expect(request.headers.has("Authorization")).toBe(false);
      expect(request.headers.has("X-Kit-Api-Key")).toBe(false);
      expect(
        Object.fromEntries(new URLSearchParams(await request.text()))
      ).toEqual({
        ...credentials,
        ...(token_type_hint !== undefined && { token_type_hint }),
      });
    }
  );

  it.each(["https://example.com/v4", "https://example.com/v4/"])(
    "supports an overridden base URL %s",
    async (baseUrl) => {
      fetchMock.mockResponseOnce("", { status: 200 });
      await revokeOAuthToken(credentials, { baseUrl });
      expect(fetchMock.requests()[0]!.url).toBe(
        "https://example.com/v4/oauth/revoke"
      );
    }
  );

  it.each([
    {
      status: 400,
      body: '{"error":"invalid_request"}',
      details: { error: "invalid_request" },
    },
    {
      status: 401,
      body: "Invalid client credentials",
      details: "Invalid client credentials",
    },
    { status: 404, body: "", details: "" },
    {
      status: 429,
      body: '{"errors":["Rate limited"]}',
      details: { errors: ["Rate limited"] },
    },
    { status: 500, body: "Server error", details: "Server error" },
  ])(
    "throws ApiError for status $status",
    async ({ status, body, details }) => {
      fetchMock.mockResponseOnce(body, { status });
      const error = await revokeOAuthToken(credentials).catch(
        (error: unknown) => error
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status, details });
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("propagates network failures", async () => {
    const error = new TypeError("Network failure");
    fetchMock.mockRejectOnce(error);
    await expect(revokeOAuthToken(credentials)).rejects.toBe(error);
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("requires credentials and restricts token type hints", () => {
    expectTypeOf<{ token: string }>().not.toExtend<RevokeOAuthTokenParams>();
    expectTypeOf<
      typeof credentials & { token_type_hint: "other" }
    >().not.toExtend<RevokeOAuthTokenParams>();
  });
});

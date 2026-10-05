import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  ApiError,
  exchangeOAuthCode,
  refreshOAuthToken,
  revokeOAuthToken,
  type ExchangeOAuthCodeParams,
  type OAuthTokenResponse,
  type RefreshOAuthTokenParams,
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

describe("OAuth token refresh", () => {
  const params = {
    client_id: "client+id",
    refresh_token: "single-use+token&value= /",
  } satisfies RefreshOAuthTokenParams;
  const tokens = {
    access_token: "new-access-token",
    token_type: "Bearer",
    expires_in: 7200,
    refresh_token: "replacement-refresh-token",
    scope: "public",
    created_at: 1710271006,
  } satisfies OAuthTokenResponse;

  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("posts the refresh grant as JSON and returns replacement tokens", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(tokens));
    const result = await refreshOAuthToken(params);
    expectTypeOf(result).toEqualTypeOf<OAuthTokenResponse>();
    expectTypeOf(result.expires_in).toEqualTypeOf<number>();
    expectTypeOf(result.created_at).toEqualTypeOf<number>();
    expectTypeOf(result.refresh_token).toEqualTypeOf<string>();
    expect(result).toEqual(tokens);
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.url).toBe("https://api.kit.com/v4/oauth/token");
    expect(request.method).toBe("POST");
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(request.headers.get("Accept")).toBe("application/json");
    expect(request.headers.has("Authorization")).toBe(false);
    expect(request.headers.has("X-Kit-Api-Key")).toBe(false);
    expect(await request.json()).toEqual({
      ...params,
      grant_type: "refresh_token",
    });
  });

  it.each(["https://example.com/v4", "https://example.com/v4/"])(
    "supports an overridden base URL %s",
    async (baseUrl) => {
      fetchMock.mockResponseOnce(JSON.stringify(tokens));
      expect(await refreshOAuthToken(params, { baseUrl })).toEqual(tokens);
      expect(fetchMock.requests()[0]!.url).toBe(
        "https://example.com/v4/oauth/token"
      );
    }
  );

  it.each([
    {
      status: 400,
      body: '{"error":"invalid_grant"}',
      details: { error: "invalid_grant" },
    },
    { status: 401, body: "Invalid client", details: "Invalid client" },
    { status: 404, body: "", details: "" },
    {
      status: 429,
      body: '{"error":"rate_limited"}',
      details: { error: "rate_limited" },
    },
    { status: 500, body: "Server error", details: "Server error" },
  ])(
    "throws ApiError without retrying status $status",
    async ({ status, body, details }) => {
      fetchMock.mockResponseOnce(body, { status });
      const error = await refreshOAuthToken(params).catch(
        (error: unknown) => error
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status,
        details,
        message: `OAuth token refresh failed. Status: ${status}`,
      });
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("propagates network failures without reusing the refresh token", async () => {
    const error = new TypeError("Network failure");
    fetchMock.mockRejectOnce(error);
    await expect(refreshOAuthToken(params)).rejects.toBe(error);
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it.each(["", "invalid JSON"])(
    "rejects malformed success body %j without retrying",
    async (body) => {
      fetchMock.mockResponseOnce(body);
      await expect(refreshOAuthToken(params)).rejects.toBeInstanceOf(
        SyntaxError
      );
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("requires both the client ID and refresh token", () => {
    expectTypeOf<{
      client_id: string;
    }>().not.toExtend<RefreshOAuthTokenParams>();
    expectTypeOf<{
      refresh_token: string;
    }>().not.toExtend<RefreshOAuthTokenParams>();
  });
});

describe("OAuth authorization code exchange", () => {
  const params = {
    client_id: "client+id",
    client_secret: "secret&value= /",
    code: "callback+code&value= /",
    redirect_uri: "https://example.com/oauth/callback?next=%2Fhome",
  } satisfies ExchangeOAuthCodeParams;
  const tokens = {
    access_token: "initial-access-token",
    token_type: "Bearer",
    expires_in: 172800,
    refresh_token: "initial-refresh-token",
    scope: "public",
    created_at: 1710270147,
  } satisfies OAuthTokenResponse;

  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("posts client credentials, code, and redirect URI as JSON and returns tokens", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(tokens));
    const result = await exchangeOAuthCode(params);
    expectTypeOf(result).toEqualTypeOf<OAuthTokenResponse>();
    expect(result).toEqual(tokens);
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.url).toBe("https://api.kit.com/v4/oauth/token");
    expect(request.method).toBe("POST");
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(request.headers.get("Accept")).toBe("application/json");
    expect(request.headers.has("Authorization")).toBe(false);
    expect(request.headers.has("X-Kit-Api-Key")).toBe(false);
    expect(await request.json()).toEqual({
      ...params,
      grant_type: "authorization_code",
    });
  });

  it.each(["https://example.com/v4", "https://example.com/v4/"])(
    "supports an overridden base URL %s",
    async (baseUrl) => {
      fetchMock.mockResponseOnce(JSON.stringify(tokens));
      expect(await exchangeOAuthCode(params, { baseUrl })).toEqual(tokens);
      expect(fetchMock.requests()[0]!.url).toBe(
        "https://example.com/v4/oauth/token"
      );
    }
  );

  it.each([
    {
      status: 400,
      body: '{"error":"invalid_grant"}',
      details: { error: "invalid_grant" },
    },
    {
      status: 401,
      body: "Invalid client credentials",
      details: "Invalid client credentials",
    },
    { status: 404, body: "", details: "" },
    {
      status: 429,
      body: '{"error":"rate_limited"}',
      details: { error: "rate_limited" },
    },
    { status: 500, body: "Server error", details: "Server error" },
  ])(
    "throws ApiError without retrying status $status",
    async ({ status, body, details }) => {
      fetchMock.mockResponseOnce(body, { status });
      const error = await exchangeOAuthCode(params).catch(
        (error: unknown) => error
      );
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status,
        details,
        message: `OAuth token exchange failed. Status: ${status}`,
      });
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("propagates network failures without repeating the exchange", async () => {
    const error = new TypeError("Network failure");
    fetchMock.mockRejectOnce(error);
    await expect(exchangeOAuthCode(params)).rejects.toBe(error);
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it.each(["", "invalid JSON"])(
    "rejects malformed success body %j without retrying",
    async (body) => {
      fetchMock.mockResponseOnce(body);
      await expect(exchangeOAuthCode(params)).rejects.toBeInstanceOf(
        SyntaxError
      );
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("requires client credentials, the callback code, and redirect URI", () => {
    expectTypeOf<
      Omit<ExchangeOAuthCodeParams, "client_id">
    >().not.toExtend<ExchangeOAuthCodeParams>();
    expectTypeOf<
      Omit<ExchangeOAuthCodeParams, "client_secret">
    >().not.toExtend<ExchangeOAuthCodeParams>();
    expectTypeOf<
      Omit<ExchangeOAuthCodeParams, "code">
    >().not.toExtend<ExchangeOAuthCodeParams>();
    expectTypeOf<
      Omit<ExchangeOAuthCodeParams, "redirect_uri">
    >().not.toExtend<ExchangeOAuthCodeParams>();
  });
});

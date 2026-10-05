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

describe.each(["refresh", "revocation", "exchange"] as const)(
  "OAuth %s cancellation",
  (operation) => {
    const refreshParams = {
      client_id: "client-id",
      refresh_token: "refresh-token",
    } satisfies RefreshOAuthTokenParams;
    const responseBody =
      operation === "revocation"
        ? ""
        : JSON.stringify({ access_token: "replacement" });

    beforeEach(() => {
      fetchMock.resetMocks();
    });

    function invoke(signal?: AbortSignal) {
      return operation === "refresh"
        ? refreshOAuthToken(refreshParams, { signal })
        : operation === "exchange"
          ? exchangeOAuthCode(
              {
                client_id: "client-id",
                client_secret: "client-secret",
                code: "code",
                redirect_uri: "https://example.com/callback",
              },
              { signal }
            )
          : revokeOAuthToken(credentials, { signal });
    }

    it("passes the caller's signal and completes without aborting it", async () => {
      const controller = new AbortController();
      fetchMock.mockResponseOnce(responseBody);
      await invoke(controller.signal);
      expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
      expect(controller.signal.aborted).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("preserves requests without a signal", async () => {
      fetchMock.mockResponseOnce(responseBody);
      await invoke();
      expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("propagates a pre-aborted signal's reason without retrying", async () => {
      const controller = new AbortController();
      const reason = new Error("Already cancelled");
      controller.abort(reason);
      fetchMock.mockImplementation((_input, init) => {
        expect(init?.signal).toBe(controller.signal);
        init?.signal?.throwIfAborted();
        return Promise.resolve(new Response(responseBody));
      });
      await expect(invoke(controller.signal)).rejects.toBe(reason);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("cancels a pending fetch without retrying", async () => {
      const controller = new AbortController();
      const reason = new Error("Request cancelled");
      fetchMock.mockImplementation(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            expect(init?.signal).toBe(controller.signal);
            init?.signal?.addEventListener(
              "abort",
              () => reject(init.signal?.reason),
              { once: true }
            );
          })
      );
      const result = expect(invoke(controller.signal)).rejects.toBe(reason);
      controller.abort(reason);
      await result;
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([200, 401])(
      "cancels a stalled %s response body without retrying",
      async (status) => {
        const controller = new AbortController();
        const reason = new Error("Body reading cancelled");
        fetchMock.mockImplementation((_input, init) =>
          Promise.resolve(
            new Response(
              new ReadableStream({
                start(stream) {
                  expect(init?.signal).toBe(controller.signal);
                  init?.signal?.addEventListener(
                    "abort",
                    () => stream.error(init.signal?.reason),
                    { once: true }
                  );
                },
              }),
              { status }
            )
          )
        );
        const result = expect(invoke(controller.signal)).rejects.toBe(reason);
        // Let the helper receive the response and begin reading its body.
        await Promise.resolve();
        controller.abort(reason);
        await result;
        expect(fetchMock).toHaveBeenCalledTimes(1);
      }
    );
  }
);
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

  it("exchanges a PKCE code with the original verifier and no client secret", async () => {
    const pkce = {
      client_id: params.client_id,
      code: params.code,
      redirect_uri: params.redirect_uri,
      code_verifier: "abcdefghijklmnopqrstuvwxyz0123456789-._~ABC",
    } satisfies ExchangeOAuthCodeParams;
    fetchMock.mockResponseOnce(JSON.stringify(tokens));

    const result = await exchangeOAuthCode(pkce);
    expectTypeOf(result).toEqualTypeOf<OAuthTokenResponse>();
    expect(result).toEqual(tokens);
    const requests = fetchMock.requests();
    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.url).toBe("https://api.kit.com/v4/oauth/token");
    expect(request.method).toBe("POST");
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(request.headers.has("Authorization")).toBe(false);
    expect(request.headers.has("X-Kit-Api-Key")).toBe(false);
    const body = await request.json();
    expect(body).toEqual({ ...pkce, grant_type: "authorization_code" });
    expect(body).not.toHaveProperty("client_secret");
  });

  it("surfaces PKCE verifier errors without retrying the exchange", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ error: "invalid_grant" }), {
      status: 400,
    });
    await expect(
      exchangeOAuthCode({
        client_id: params.client_id,
        code: params.code,
        redirect_uri: params.redirect_uri,
        code_verifier: "abcdefghijklmnopqrstuvwxyz0123456789-._~ABC",
      })
    ).rejects.toMatchObject({
      status: 400,
      details: { error: "invalid_grant" },
    });
    expect(fetchMock.requests()).toHaveLength(1);
  });

  it("requires exactly one credential form", () => {
    type Callback = { client_id: string; code: string; redirect_uri: string };
    expectTypeOf<Callback>().not.toExtend<ExchangeOAuthCodeParams>();
    expectTypeOf<
      Callback & { client_secret: string }
    >().toExtend<ExchangeOAuthCodeParams>();
    expectTypeOf<
      Callback & { code_verifier: string }
    >().toExtend<ExchangeOAuthCodeParams>();
    expectTypeOf<
      Callback & { client_secret: string; code_verifier: string }
    >().not.toExtend<ExchangeOAuthCodeParams>();
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

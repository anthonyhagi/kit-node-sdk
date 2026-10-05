import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  buildOAuthAuthorizationUrl,
  generateOAuthPKCE,
  type BuildOAuthAuthorizationUrlParams,
} from "~/index";

const required = {
  client_id: "client+id&value= /",
  redirect_uri:
    "https://example.com/callback?next=%2Fhome&label=hello+world#section",
} satisfies BuildOAuthAuthorizationUrlParams;

describe("OAuth authorization URL builder", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("encodes required values and sets the authorization code response type", () => {
    const result = buildOAuthAuthorizationUrl(required);
    expectTypeOf(result).toEqualTypeOf<string>();
    const url = new URL(result);
    expect(url.origin).toBe("https://api.kit.com");
    expect(url.pathname).toBe("/v4/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ...required,
      response_type: "code",
    });
    expect(url.hash).toBe("");
    expect(fetchMock.requests()).toHaveLength(0);
  });

  it("preserves optional state, scope, and tenant name values", () => {
    const params = {
      ...required,
      state: "state+&= /",
      scope: "public read",
      tenant_name: "Creator & Co",
    } satisfies BuildOAuthAuthorizationUrlParams;
    const url = new URL(buildOAuthAuthorizationUrl(params));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ...params,
      response_type: "code",
    });
  });

  it("omits undefined optional values", () => {
    const url = new URL(
      buildOAuthAuthorizationUrl({
        ...required,
        state: undefined,
        scope: undefined,
        tenant_name: undefined,
      })
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ...required,
      response_type: "code",
    });
  });

  it("preserves explicitly empty optional values", () => {
    const params = { ...required, state: "", scope: "", tenant_name: "" };
    expect(
      Object.fromEntries(
        new URL(buildOAuthAuthorizationUrl(params)).searchParams
      )
    ).toEqual({ ...params, response_type: "code" });
  });

  it("includes generated PKCE challenge fields without exposing the verifier", () => {
    const pkce = generateOAuthPKCE();
    const url = new URL(buildOAuthAuthorizationUrl({ ...required, ...pkce }));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ...required,
      response_type: "code",
      code_challenge: pkce.code_challenge,
      code_challenge_method: "S256",
    });
    expect(url.searchParams.has("code_verifier")).toBe(false);
    expect(fetchMock.requests()).toHaveLength(0);
  });

  it.each(["https://example.com/v4", "https://example.com/v4/"])(
    "supports base URL %s",
    (baseUrl) => {
      const url = new URL(buildOAuthAuthorizationUrl(required, { baseUrl }));
      expect(url.origin).toBe("https://example.com");
      expect(url.pathname).toBe("/v4/oauth/authorize");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        ...required,
        response_type: "code",
      });
    }
  );

  it("requires client and redirect fields and a complete S256 challenge pair", () => {
    type Base = typeof required;
    expectTypeOf<
      Omit<Base, "client_id">
    >().not.toExtend<BuildOAuthAuthorizationUrlParams>();
    expectTypeOf<
      Omit<Base, "redirect_uri">
    >().not.toExtend<BuildOAuthAuthorizationUrlParams>();
    expectTypeOf<
      Base & { code_challenge: string }
    >().not.toExtend<BuildOAuthAuthorizationUrlParams>();
    expectTypeOf<
      Base & { code_challenge_method: "S256" }
    >().not.toExtend<BuildOAuthAuthorizationUrlParams>();
    expectTypeOf<
      Base & { code_challenge: string; code_challenge_method: "plain" }
    >().not.toExtend<BuildOAuthAuthorizationUrlParams>();
  });
});

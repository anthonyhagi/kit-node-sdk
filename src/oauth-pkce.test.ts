import { Buffer } from "node:buffer";
import { createHash, randomBytes } from "node:crypto";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { generateOAuthPKCE, type OAuthPKCE } from "~/index";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    randomBytes: vi.fn((size: number) => actual.randomBytes(size)),
  };
});

describe("OAuth PKCE generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.resetMocks();
  });

  it("matches the RFC 7636 Appendix B S256 test vector", () => {
    // https://www.rfc-editor.org/rfc/rfc7636#appendix-B
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    vi.mocked(randomBytes).mockImplementationOnce(() =>
      Buffer.from(verifier, "base64url")
    );

    const result = generateOAuthPKCE();
    expectTypeOf(result).toEqualTypeOf<OAuthPKCE>();
    expectTypeOf(result.code_challenge_method).toEqualTypeOf<"S256">();
    expect(result).toEqual({
      code_verifier: verifier,
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      code_challenge_method: "S256",
    });
    expect(randomBytes).toHaveBeenCalledExactlyOnceWith(32);
    expect(fetchMock.requests()).toHaveLength(0);
  });

  it("generates fresh URL-safe verifiers and matching unpadded challenges", () => {
    const first = generateOAuthPKCE();
    const second = generateOAuthPKCE();
    expect(first.code_verifier).not.toBe(second.code_verifier);
    for (const result of [first, second]) {
      expect(result.code_verifier).toMatch(/^[\w-]{43}$/);
      expect(result.code_challenge).toMatch(/^[\w-]{43}$/);
      expect(result.code_challenge).toBe(
        createHash("sha256").update(result.code_verifier).digest("base64url")
      );
      expect(result.code_challenge_method).toBe("S256");
    }
    expect(randomBytes).toHaveBeenCalledTimes(2);
    expect(randomBytes).toHaveBeenNthCalledWith(1, 32);
    expect(randomBytes).toHaveBeenNthCalledWith(2, 32);
    expect(fetchMock.requests()).toHaveLength(0);
  });

  it("propagates a cryptographic random source failure", () => {
    const error = new Error("Random source unavailable");
    vi.mocked(randomBytes).mockImplementationOnce(() => {
      throw error;
    });
    expect(() => generateOAuthPKCE()).toThrow(error);
    expect(randomBytes).toHaveBeenCalledExactlyOnceWith(32);
  });
});

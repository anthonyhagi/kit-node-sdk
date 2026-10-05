import { Buffer } from "node:buffer";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import {
  verifyWebhookSignature,
  type VerifyWebhookSignatureOptions,
} from "~/index";

// Fixed HMAC-SHA256 vectors computed independently with Python's hmac module.
const timestamp = 1753797130;
const body = '{ "events": [] }';
const secret = "whsec_test";
const signature =
  "5202c7c809b8fa5bc826e13f39f76bfe03f56875cab448e16b92ff6c0257f9a3";
const rotatedSignature =
  "5993795e13a4a153baf0000aa008119ee9993d5331f2a27980a7f07fdeef9303";
const header = `t=${timestamp},v1=${signature}`;

describe("webhook signature verification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(timestamp * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies a known signature using raw text or bytes", () => {
    expect(verifyWebhookSignature(body, header, secret)).toBe(true);
    expect(verifyWebhookSignature(Buffer.from(body), header, secret)).toBe(
      true
    );
    expect(
      verifyWebhookSignature(new TextEncoder().encode(body), header, secret)
    ).toBe(true);
    expectTypeOf(
      verifyWebhookSignature(body, header, secret)
    ).toEqualTypeOf<boolean>();
    expectTypeOf<VerifyWebhookSignatureOptions>().toEqualTypeOf<{
      toleranceSeconds?: number | undefined;
    }>();
  });

  it("preserves UTF-8 bytes", () => {
    const unicodeBody = '{"name":"Ada 🌿"}';
    const unicodeHeader = `t=${timestamp},v1=953a2972cf29daa4a97a9662837a49db94ff8614442b29c34134cdf1563fe7fd`;
    expect(
      verifyWebhookSignature(Buffer.from(unicodeBody), unicodeHeader, secret)
    ).toBe(true);
  });

  it("preserves arbitrary bytes without decoding them as text", () => {
    const bytes = new Uint8Array([0, 255, 128, 13, 10]);
    const binaryHeader = `t=${timestamp},v1=c6fec91c7123a1408a61a5d23caf6c6544cd7af1154ff779ffe25f34d81eee82`;
    expect(verifyWebhookSignature(bytes, binaryHeader, secret)).toBe(true);
    expect(
      verifyWebhookSignature(
        new TextDecoder().decode(bytes),
        binaryHeader,
        secret
      )
    ).toBe(false);
  });

  it("rejects altered payloads, reserialized JSON, and wrong secrets", () => {
    expect(verifyWebhookSignature(`${body} `, header, secret)).toBe(false);
    expect(
      verifyWebhookSignature(JSON.stringify(JSON.parse(body)), header, secret)
    ).toBe(false);
    expect(verifyWebhookSignature(body, header, "wrong")).toBe(false);
    expect(verifyWebhookSignature(body, header, "")).toBe(false);
  });

  it("accepts either signature during secret rotation, in either order", () => {
    for (const signatures of [
      `v1=${signature},v1=${rotatedSignature}`,
      `v1=${rotatedSignature},v1=${signature}`,
    ]) {
      const rotationHeader = `t=${timestamp},${signatures}`;
      expect(verifyWebhookSignature(body, rotationHeader, secret)).toBe(true);
      expect(
        verifyWebhookSignature(body, rotationHeader, "whsec_rotated")
      ).toBe(true);
    }
  });

  it("handles whitespace and unknown signature versions", () => {
    expect(
      verifyWebhookSignature(
        body,
        ` v2=ignored , t=${timestamp} , v1=${signature} `,
        secret
      )
    ).toBe(true);
    expect(
      verifyWebhookSignature(body, `t=${timestamp},v2=${signature}`, secret)
    ).toBe(false);
  });

  it.each([null, undefined, "", `v1=${signature}`, `t=${timestamp}`])(
    "rejects missing header components: %s",
    (invalidHeader) => {
      expect(verifyWebhookSignature(body, invalidHeader, secret)).toBe(false);
    }
  );

  it.each([
    "",
    "NaN",
    "Infinity",
    "-1",
    "1.5",
    "1e9",
    "0x123",
    "9007199254740992",
  ])("rejects malformed timestamps: %s", (invalidTimestamp) => {
    expect(
      verifyWebhookSignature(
        body,
        `t=${invalidTimestamp},v1=${signature}`,
        secret
      )
    ).toBe(false);
  });

  it("rejects duplicate timestamps and timestamp tampering", () => {
    expect(
      verifyWebhookSignature(body, `${header},t=${timestamp}`, secret)
    ).toBe(false);
    expect(
      verifyWebhookSignature(body, `t=${timestamp + 1},v1=${signature}`, secret)
    ).toBe(false);
  });

  it.each([
    "",
    "abc",
    "g".repeat(64),
    "0".repeat(63),
    "0".repeat(65),
    `${signature}extra`,
  ])(
    "rejects malformed signatures without throwing: %s",
    (invalidSignature) => {
      expect(
        verifyWebhookSignature(
          body,
          `t=${timestamp},v1=${invalidSignature}`,
          secret
        )
      ).toBe(false);
    }
  );

  it("checks valid signatures even if another candidate is malformed or mismatched", () => {
    expect(
      verifyWebhookSignature(
        body,
        `t=${timestamp},v1=bad,v1=${"0".repeat(64)},v1=${signature}`,
        secret
      )
    ).toBe(true);
  });

  it.each([-300, 300])(
    "accepts the default tolerance boundary (%s seconds)",
    (offset) => {
      vi.setSystemTime((timestamp + offset) * 1000);
      expect(verifyWebhookSignature(body, header, secret)).toBe(true);
    }
  );

  it.each([-301, 301])(
    "rejects timestamps beyond the default tolerance (%s seconds)",
    (offset) => {
      vi.setSystemTime((timestamp + offset) * 1000);
      expect(verifyWebhookSignature(body, header, secret)).toBe(false);
    }
  );

  it("supports a custom tolerance and zero tolerance", () => {
    expect(
      verifyWebhookSignature(body, header, secret, { toleranceSeconds: 0 })
    ).toBe(true);
    vi.setSystemTime((timestamp + 301) * 1000);
    expect(
      verifyWebhookSignature(body, header, secret, { toleranceSeconds: 600 })
    ).toBe(true);
    expect(
      verifyWebhookSignature(body, header, secret, { toleranceSeconds: 0 })
    ).toBe(false);
  });

  it.each([-1, NaN, Infinity, -Infinity])(
    "rejects an invalid configured tolerance (%s)",
    (toleranceSeconds) => {
      expect(() =>
        verifyWebhookSignature(body, header, secret, { toleranceSeconds })
      ).toThrow(RangeError);
    }
  );
});

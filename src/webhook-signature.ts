import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifyWebhookSignatureOptions {
  /** Maximum timestamp age or future clock skew in seconds. Default 300. */
  toleranceSeconds?: number | undefined;
}

/**
 * Verify a Kit webhook endpoint delivery before parsing or processing its body.
 * Pass the exact raw bytes received, the X-Kit-Signature header, and the saved
 * endpoint signing secret. Any matching v1 signature is accepted during rotation.
 * Missing/malformed headers, stale timestamps, and invalid signatures return false.
 * @throws {RangeError} If toleranceSeconds is not finite and nonnegative.
 * @see https://developers.kit.com/webhooks/verifying-signatures
 */
export function verifyWebhookSignature(
  rawBody: string | Uint8Array,
  header: string | null | undefined,
  secret: string,
  { toleranceSeconds = 300 }: VerifyWebhookSignatureOptions = {}
): boolean {
  if (!Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) {
    throw new RangeError("toleranceSeconds must be finite and nonnegative");
  }
  if (!header || !secret) {
    return false;
  }

  const parts = header.split(",").map((part) => part.trim());
  const timestamps = parts.filter((part) => part.startsWith("t="));
  if (timestamps.length !== 1) {
    return false;
  }
  const timestamp = timestamps[0]!.slice(2);
  if (!/^\d+$/.test(timestamp)) {
    return false;
  }
  const signedAt = Number(timestamp);
  if (
    !Number.isSafeInteger(signedAt) ||
    Math.abs(Date.now() / 1000 - signedAt) > toleranceSeconds
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest();
  let valid = false;
  for (const part of parts) {
    if (!part.startsWith("v1=")) {
      continue;
    }
    const signature = part.slice(3);
    if (!/^[\da-f]{64}$/i.test(signature)) {
      continue;
    }
    const matches = timingSafeEqual(Buffer.from(signature, "hex"), expected);
    valid = matches || valid;
  }
  return valid;
}

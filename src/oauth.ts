import { ApiError } from "./errors";

export interface RevokeOAuthTokenParams {
  /** Kit-issued access token or refresh token to invalidate. */
  token: string;
  client_id: string;
  client_secret: string;
  token_type_hint?: "access_token" | "refresh_token" | undefined;
}

export interface RevokeOAuthTokenOptions {
  /** Defaults to https://api.kit.com/v4. */
  baseUrl?: string | undefined;
}

/**
 * Revoke a Kit-issued token when a creator disconnects your app.
 * A successful response also covers unknown, expired, or already revoked tokens.
 * Makes one request; network failures propagate and HTTP failures throw ApiError.
 *
 * @see {@link https://developers.kit.com/api-reference/oauth-token-revocation}
 */
export async function revokeOAuthToken(
  params: RevokeOAuthTokenParams,
  options?: RevokeOAuthTokenOptions
): Promise<void> {
  const { token, client_id, client_secret, token_type_hint } = params;
  const body = new URLSearchParams({ token, client_id, client_secret });
  if (token_type_hint !== undefined) {
    body.set("token_type_hint", token_type_hint);
  }
  const baseUrl = options?.baseUrl ?? "https://api.kit.com/v4";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/oauth/revoke`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  // Revocation succeeds with an empty body; do not try to parse it as JSON.
  const responseBody = await response.text();
  if (!response.ok) {
    let details: unknown;
    try {
      details = JSON.parse(responseBody);
    } catch {
      details = responseBody;
    }
    throw new ApiError(
      `OAuth token revocation failed. Status: ${response.status}`,
      response.status,
      details
    );
  }
}

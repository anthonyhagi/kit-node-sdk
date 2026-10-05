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

export interface RefreshOAuthTokenParams {
  client_id: string;
  /** Single-use token. Store the replacement returned by this request. */
  refresh_token: string;
}

export type RefreshOAuthTokenOptions = RevokeOAuthTokenOptions;

export interface ExchangeOAuthCodeParams {
  client_id: string;
  client_secret: string;
  /** Authorization code received at the OAuth callback. */
  code: string;
  /** Redirect URI used for authorization, matching an app-configured URI. */
  redirect_uri: string;
}

export type ExchangeOAuthCodeOptions = RevokeOAuthTokenOptions;

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  /** Access token lifetime in seconds. */
  expires_in: number;
  /** Replacement refresh token to store for the next refresh. */
  refresh_token: string;
  scope: string;
  /** Token creation time as Unix seconds. */
  created_at: number;
}

/**
 * Obtain new access and refresh tokens using a single-use refresh token.
 * Store the returned refresh_token; the submitted token is now revoked.
 * Makes one request without automatic retries. Network and parsing failures
 * propagate; HTTP failures throw ApiError.
 *
 * @see {@link https://developers.kit.com/api-reference/oauth-refresh-token-flow}
 */
export async function refreshOAuthToken(
  params: RefreshOAuthTokenParams,
  options?: RefreshOAuthTokenOptions
): Promise<OAuthTokenResponse> {
  const { client_id, refresh_token } = params;
  return await requestOAuthTokens(
    {
      client_id,
      grant_type: "refresh_token",
      refresh_token,
    },
    options,
    "refresh"
  );
}

/**
 * Exchange an authorization code for access and refresh tokens using client credentials.
 * Makes one request without automatic retries. Network and parsing failures
 * propagate; HTTP failures throw ApiError.
 *
 * @see {@link https://developers.kit.com/api-reference/oauth-refresh-token-flow}
 */
export async function exchangeOAuthCode(
  params: ExchangeOAuthCodeParams,
  options?: ExchangeOAuthCodeOptions
): Promise<OAuthTokenResponse> {
  const { client_id, client_secret, code, redirect_uri } = params;
  return await requestOAuthTokens(
    {
      client_id,
      client_secret,
      grant_type: "authorization_code",
      code,
      redirect_uri,
    },
    options,
    "exchange"
  );
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
  await readOAuthResponse(response, "revocation");
}

async function requestOAuthTokens(
  body: Record<string, string>,
  options: RevokeOAuthTokenOptions | undefined,
  operation: "refresh" | "exchange"
): Promise<OAuthTokenResponse> {
  const baseUrl = options?.baseUrl ?? "https://api.kit.com/v4";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const responseBody = await readOAuthResponse(response, operation);
  return JSON.parse(responseBody) as OAuthTokenResponse;
}

async function readOAuthResponse(
  response: Response,
  operation: "refresh" | "revocation" | "exchange"
): Promise<string> {
  const responseBody = await response.text();
  if (!response.ok) {
    let details: unknown;
    try {
      details = JSON.parse(responseBody);
    } catch {
      details = responseBody;
    }
    throw new ApiError(
      `OAuth token ${operation} failed. Status: ${response.status}`,
      response.status,
      details
    );
  }
  return responseBody;
}

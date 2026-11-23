/** An unsuccessful HTTP response from the Kit API. */
export class ApiError extends Error {
  /** HTTP status code returned by the API. */
  public readonly status: number;

  /** Parsed JSON response body, or raw text when the body is not JSON. */
  public readonly details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * An HTTP 404 response from the Kit API: the resource is missing or not
 * accessible with the current credentials. Extends {@link ApiError}, so existing
 * `instanceof ApiError` checks still match.
 */
export class NotFoundError extends ApiError {
  declare public readonly status: 404;

  constructor(message: string, details: unknown) {
    super(message, 404, details);
    this.name = "NotFoundError";
  }
}

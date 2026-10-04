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

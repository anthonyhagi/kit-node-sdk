import { delay } from "./utils/helpers";

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | (string & {});

type ApiClientOptions = {
  baseUrl: string;
  maxRetries?: number;
  retryDelay?: number;
};

export class ApiClient {
  baseUrl: string;
  maxRetries: number;
  retryDelay: number;

  constructor({
    baseUrl,
    maxRetries = 3,
    retryDelay = 1000,
  }: ApiClientOptions) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Set the default auth headers.
   *
   * @returns The auth headers to set for each request.
   */
  protected authHeaders(): Record<string, string> {
    return {};
  }

  /**
   * Set the default headers to attach to every request.
   *
   * @returns The default auth headers.
   */
  protected defaultHeaders(): Record<string, string> {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": this.getUserAgent(),
    };
  }

  public async get<TResponseType = unknown>(
    path: string,
    options?: {
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
    }
  ): Promise<TResponseType> {
    return await this.request<TResponseType>("GET", path, options);
  }

  public async post<TResponseType = unknown>(
    path: string,
    options?: {
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ) {
    return await this.request<TResponseType>("POST", path, options);
  }

  public async put<TResponseType = unknown>(
    path: string,
    options?: {
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ) {
    return await this.request<TResponseType>("PUT", path, options);
  }

  public async delete<TResponseType = unknown>(
    path: string,
    options?: {
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ) {
    return await this.request<TResponseType>("DELETE", path, options);
  }

  protected async request<TResponseType = unknown>(
    method: HttpMethod,
    path: string,
    options?: {
      headers?: Record<string, string>;
      query?: URLSearchParams | undefined;
      body?: RequestInit["body"];
    }
  ): Promise<TResponseType> {
    const cleanedBaseUrl = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;

    const cleanedPath = path.startsWith("/") ? path.slice(1) : path;
    let url = `${cleanedBaseUrl}/${cleanedPath}`;

    if (options?.query && options.query.size > 0) {
      url = `${url}?${options.query.toString()}`;
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders(),
      ...this.authHeaders(),
      ...options?.headers,
    };

    const fetchOptions: RequestInit = {
      headers: new Headers(headers),
      method: method.toUpperCase(),
      body: options?.body,
    };

    // Based on the number of attempts we should make, continue
    // retrying the request. For specified errors, we should
    // retry the request until we have exhausted
    // all attempts.
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      let resp: Response;

      try {
        resp = await fetch(url, fetchOptions);
      } catch (error: unknown) {
        // Only fetch failures are eligible for network retries.
        if (error instanceof Error && attempt < this.maxRetries) {
          await delay(this.calculateDelay(attempt));
          continue;
        }
        throw error;
      }

      if (!resp.ok) {
        if (this.shouldRetry(resp.status) && attempt < this.maxRetries) {
          await delay(this.calculateDelay(attempt));
          continue;
        }

        return (await this.handleError(resp)) as TResponseType;
      }

      if (resp.status === 204) {
        const emptyObj = {};
        return emptyObj as TResponseType;
      }

      // A successful operation must not be repeated if reading or parsing
      // its response fails. Keep body handling outside the fetch catch.
      const body = await resp.text();

      if (body.length === 0) {
        const emptyObj = {};
        return emptyObj as TResponseType;
      }

      return JSON.parse(body) as TResponseType;
    }

    throw new Error("Request failed after all retry attempts");
  }

  private async handleError(resp: Response): Promise<null | never> {
    let detailsString: string;

    // Close the response such that we can read the body multiple times.
    // This is only used if we receive an error AND the body could not
    // be parsed as JSON.
    const clonedResp = resp.clone();

    try {
      const errorDetails: any = await resp.json();

      if (
        resp.status >= 400 &&
        resp.status < 500 &&
        errorDetails &&
        Array.isArray(errorDetails.errors)
      ) {
        detailsString = `Errors: ${errorDetails.errors.join(", ")}`;
      } else {
        detailsString = JSON.stringify(errorDetails);
      }
    } catch {
      detailsString = await clonedResp.text();
    }

    switch (resp.status) {
      case 401:
        throw new Error(
          `Authentication failed: Invalid or expired access token. Status: ${resp.status} - ${detailsString}`
        );

      case 404:
        return null;

      case 429:
        throw new Error(
          `Rate limit exceeded. Status: ${resp.status} - ${detailsString}`
        );

      case 422:
        throw new Error(
          `Bad data in request. Status: ${resp.status} - ${detailsString}`
        );

      case 500:
        throw new Error(
          `Internal server error. Status: ${resp.status} - Details: ${detailsString}`
        );

      default:
        throw new Error(
          `Unknown error. Status: ${resp.status} - Details: ${detailsString}`
        );
    }
  }

  /**
   * Determines if a request should be retried based on the HTTP status code.
   *
   * @param statusCode - The HTTP status code to evaluate
   * @returns true if the request should be retried, false otherwise
   */
  private shouldRetry(statusCode: number): boolean {
    return statusCode >= 500 || statusCode === 429;
  }

  /**
   * Calculates the delay for exponential backoff.
   *
   * @param attempt - The current attempt number (0-based)
   * @returns The delay in milliseconds.
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (2 ^ attempt) with some jitter
    const exponentialDelay = this.retryDelay * 2 ** attempt;

    // Add jitter to prevent thundering herd (±25% randomization)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);

    return Math.floor(exponentialDelay + jitter);
  }

  private getUserAgent(): string {
    return `${this.constructor.name}/JS`;
  }
}

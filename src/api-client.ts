type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | (string & {});

export class ApiClient {
  baseUrl: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl;
  }

  protected authHeaders(): Record<string, string> {
    return {};
  }

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
      ...(options?.headers || {}),
    };

    const fetchOptions: RequestInit = {
      headers: new Headers(headers),
      method: method.toUpperCase(),
      body: options?.body,
    };

    const resp = await fetch(url, fetchOptions);

    if (!resp.ok) {
      return (await this.handleError(resp)) as TResponseType;
    }

    // There's no need to return any data as the response
    // indicates there is no content.
    if (resp.status === 204) {
      return null as TResponseType;
    }

    const data = await resp.json();

    return data as TResponseType;
  }

  private async handleError(resp: Response): Promise<null | never> {
    let errorDetails: any = null;
    let detailsString: string = "";

    try {
      errorDetails = await resp.json();

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
      errorDetails = await resp.text();
      detailsString = errorDetails;
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

  private getUserAgent(): string {
    return `${this.constructor.name}/JS`;
  }
}

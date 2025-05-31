import { beforeEach, describe, expect, it } from "vitest";
import { ApiClient } from "./api-client";

describe("api-client", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it("initialises correctly", () => {
    const api = new ApiClient({ baseUrl: "" });

    expect(api).toBeDefined();
    expect(api).toBeInstanceOf(ApiClient);
  });

  it("sets the baseUrl parameter correctly", () => {
    const api = new ApiClient({ baseUrl: "http://localhost" });

    expect(api.baseUrl).toBe("http://localhost");
  });

  it("correctly sends a GET request using the base url and path", async ({
    expect,
  }) => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const api = new ApiClient({ baseUrl: "http://localhost" });

    await api.get("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(fetchMock.requests()[0]?.url).toBe("http://localhost/some/route");
    expect(fetchMock.requests()[0]?.method).toBe("GET");
  });

  it("correctly sends a POST request using the base url and path", async ({
    expect,
  }) => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const api = new ApiClient({ baseUrl: "http://localhost" });

    await api.post("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(fetchMock.requests()[0]?.url).toBe("http://localhost/some/route");
    expect(fetchMock.requests()[0]?.method).toBe("POST");
  });

  it("correctly sends a PUT request using the base url and path", async ({
    expect,
  }) => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const api = new ApiClient({ baseUrl: "http://localhost" });

    await api.put("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(fetchMock.requests()[0]?.url).toBe("http://localhost/some/route");
    expect(fetchMock.requests()[0]?.method).toBe("PUT");
  });

  it("correctly sends a DELETE request using the base url and path", async ({
    expect,
  }) => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const api = new ApiClient({ baseUrl: "http://localhost" });

    await api.delete("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(fetchMock.requests()[0]?.url).toBe("http://localhost/some/route");
    expect(fetchMock.requests()[0]?.method).toBe("DELETE");
  });

  it("returns `null` for a 404 response", async () => {
    fetchMock.mockResponseOnce({ status: 404 });

    const api = new ApiClient({ baseUrl: "http://localhost" });

    const resp = await api.get("/some/route");

    expect(fetchMock.requests().length).toBe(1);
    expect(resp).toBe(null);
  });
});

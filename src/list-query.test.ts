import { beforeEach, describe, expect, it } from "vitest";
import { Kit } from "~/index";

type PaginationParams = {
  after?: string | undefined;
  per_page?: number | undefined;
  include_total_count?: boolean | undefined;
};

const endpoints: {
  name: string;
  path: string;
  collection: string;
  invoke: (kit: Kit, params: PaginationParams) => Promise<unknown>;
  body?: { all: [] };
}[] = [
  {
    name: "broadcasts.list",
    path: "/broadcasts",
    collection: "broadcasts",
    invoke: (kit, params) => kit.broadcasts.list(params),
  },
  {
    name: "customFields.list",
    path: "/custom_fields",
    collection: "custom_fields",
    invoke: (kit, params) => kit.customFields.list(params),
  },
  {
    name: "emailTemplates.list",
    path: "/email_templates",
    collection: "email_templates",
    invoke: (kit, params) => kit.emailTemplates.list(params),
  },
  {
    name: "forms.list",
    path: "/forms",
    collection: "forms",
    invoke: (kit, params) => kit.forms.list(params),
  },
  {
    name: "forms.listSubscribers",
    path: "/forms/7/subscribers",
    collection: "subscribers",
    invoke: (kit, params) => kit.forms.listSubscribers(7, params),
  },
  {
    name: "purchases.list",
    path: "/purchases",
    collection: "purchases",
    invoke: (kit, params) => kit.purchases.list(params),
  },
  {
    name: "segments.list",
    path: "/segments",
    collection: "segments",
    invoke: (kit, params) => kit.segments.list(params),
  },
  {
    name: "sequences.listSubscribers",
    path: "/sequences/8/subscribers",
    collection: "subscribers",
    invoke: (kit, params) => kit.sequences.listSubscribers(8, params),
  },
  {
    name: "subscribers.list",
    path: "/subscribers",
    collection: "subscribers",
    invoke: (kit, params) => kit.subscribers.list(params),
  },
  {
    name: "subscribers.filter",
    path: "/subscribers/filter",
    collection: "subscribers",
    invoke: (kit, params) => kit.subscribers.filter({ all: [] }, params),
    body: { all: [] },
  },
  {
    name: "subscribers.getTags",
    path: "/subscribers/42/tags",
    collection: "tags",
    invoke: (kit, params) => kit.subscribers.getTags(42, params),
  },
  {
    name: "tags.list",
    path: "/tags",
    collection: "tags",
    invoke: (kit, params) => kit.tags.list(params),
  },
  {
    name: "tags.listSubscribers",
    path: "/tags/10/subscribers",
    collection: "subscribers",
    invoke: (kit, params) => kit.tags.listSubscribers(10, params),
  },
];

describe.each(endpoints)(
  "$name count query serialization",
  ({ path, collection, invoke, body }) => {
    let kit: Kit;
    beforeEach(() => {
      fetchMock.resetMocks();
      kit = new Kit({ apiKey: "test-key", maxRetries: 0 });
    });

    it.each([true, false, undefined])(
      "preserves include_total_count: %s with pagination",
      async (include_total_count) => {
        const response = {
          [collection]: [],
          pagination: {
            has_previous_page: false,
            has_next_page: false,
            start_cursor: "start",
            end_cursor: "end",
            per_page: 25,
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(response));
        expect(
          await invoke(kit, {
            include_total_count,
            after: "next+/=",
            per_page: 25,
          })
        ).toEqual(response);
        expect(fetchMock.requests()).toHaveLength(1);
        const req = fetchMock.requests()[0]!;
        const url = new URL(req.url);
        expect(req.method).toBe(body ? "POST" : "GET");
        expect(url.origin).toBe("https://api.kit.com");
        expect(url.pathname).toBe(`/v4${path}`);
        expect(Object.fromEntries(url.searchParams)).toEqual({
          after: "next+/=",
          per_page: "25",
          ...(include_total_count !== undefined && {
            include_total_count: String(include_total_count),
          }),
        });
        expect(req.headers.get("X-Kit-Api-Key")).toBe("test-key");
        if (body) expect(await req.json()).toEqual(body);
        else expect(await req.text()).toBe("");
      }
    );
  }
);

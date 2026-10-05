import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  Kit,
  type CreatePurchase,
  type GetPurchase,
  type ListPurchases,
  type ListPurchasesParams,
  type Purchase,
  type PurchaseProduct,
} from "~/index";

// First purchase in Kit's documented list response:
// https://developers.kit.com/api-reference/purchases/list-purchases
const purchaseWithoutSource = {
  id: 3,
  transaction_id: "512-41-4101",
  status: "paid",
  email_address: "pru.magoo@convertkit.dev",
  subscriber_id: 13,
  currency: "USD",
  transaction_time: "2023-02-17T11:43:55Z",
  subtotal: 5,
  discount: 0,
  tax: 0,
  total: 5,
  products: [
    {
      quantity: 1,
      lid: "000-13-0000",
      unit_price: 0.05,
      sku: null,
      name: "Tip",
      pid: "111-75-7524",
    },
  ],
};
const purchase = { ...purchaseWithoutSource, source: "Gumroad" };
const response = {
  purchases: [purchase],
  pagination: {
    has_previous_page: false,
    has_next_page: false,
    start_cursor: "WzNd",
    end_cursor: "WzNd",
    per_page: 500,
  },
} satisfies ListPurchases;

describe("purchase list response through Kit", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it.each(["network", 500, 503, 429] as const)(
    "does not retry purchase creation after %s by default",
    async (failure) => {
      const kit = new Kit({ apiKey: "test-key", maxRetries: 3, retryDelay: 0 });
      if (failure === "network") {
        fetchMock.mockRejectOnce(new Error("Connection lost"));
      } else {
        fetchMock.mockResponseOnce(JSON.stringify({ errors: ["Failed"] }), {
          status: failure,
        });
      }
      fetchMock.mockResponseOnce(JSON.stringify({ purchase }));
      await expect(kit.purchases.create({ purchase })).rejects.toThrow();
      expect(fetchMock.requests()).toHaveLength(1);
    }
  );

  it("allows an explicit purchase retry override without changing client retries", async () => {
    const kit = new Kit({ apiKey: "test-key", maxRetries: 0, retryDelay: 0 });
    fetchMock.mockRejectOnce(new Error("Connection lost"));
    fetchMock.mockResponseOnce(JSON.stringify({ purchase }));
    expect(await kit.purchases.create({ purchase }, { maxRetries: 1 })).toEqual(
      { purchase }
    );
    expect(fetchMock.requests()).toHaveLength(2);
    expect(kit.maxRetries).toBe(0);
  });

  it("keeps the client retry policy for purchase reads", async () => {
    const kit = new Kit({ apiKey: "test-key", maxRetries: 1, retryDelay: 0 });
    fetchMock.mockRejectOnce(new Error("Connection lost"));
    fetchMock.mockResponseOnce(JSON.stringify(response));
    expect(await kit.purchases.list()).toEqual(response);
    expect(fetchMock.requests()).toHaveLength(2);
  });

  it("accepts documented nullable pagination parameters", () => {
    expectTypeOf<ListPurchasesParams["after"]>().toEqualTypeOf<
      string | null | undefined
    >();
    expectTypeOf<ListPurchasesParams["before"]>().toEqualTypeOf<
      string | null | undefined
    >();
    expectTypeOf<ListPurchasesParams["per_page"]>().toEqualTypeOf<
      number | null | undefined
    >();
    expectTypeOf<ListPurchasesParams["include_total_count"]>().toEqualTypeOf<
      boolean | undefined
    >();
  });

  it.each([
    {
      params: { after: null, before: null, per_page: null },
      expected: "",
    },
    {
      params: {
        after: null,
        before: "previous-cursor",
        per_page: 25,
        include_total_count: false,
      },
      expected: "before=previous-cursor&include_total_count=false&per_page=25",
    },
    {
      params: {
        after: "next-cursor",
        before: null,
        per_page: 25,
        include_total_count: true,
      },
      expected: "after=next-cursor&include_total_count=true&per_page=25",
    },
    {
      params: {
        after: "next-cursor",
        before: "previous-cursor",
        per_page: null,
        include_total_count: false,
      },
      expected:
        "after=next-cursor&before=previous-cursor&include_total_count=false",
    },
  ])(
    "omits null pagination values from $params",
    async ({ params, expected }) => {
      fetchMock.mockResponseOnce(JSON.stringify(response));
      const kit = new Kit({ apiKey: "oauth-token", authType: "oauth" });

      await expect(kit.purchases.list(params)).resolves.toEqual(response);

      const request = fetchMock.requests()[0]!;
      const url = new URL(request.url);
      expect(url.pathname).toBe("/v4/purchases");
      expect(url.searchParams.toString()).toBe(expected);
      expect(request.method).toBe("GET");
      expect(request.headers.get("Authorization")).toBe("Bearer oauth-token");
    }
  );

  it("preserves string transaction and line-item IDs from the API", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const kit = new Kit({
      apiKey: "oauth-token",
      authType: "oauth",
      maxRetries: 0,
    });

    const result = await kit.purchases.list();
    expectTypeOf(result).toEqualTypeOf<ListPurchases>();
    const listedPurchase = result.purchases[0]!;
    const product = listedPurchase.products[0]!;
    expectTypeOf(listedPurchase).toEqualTypeOf<Purchase>();
    expectTypeOf(product).toEqualTypeOf<PurchaseProduct>();
    expectTypeOf(listedPurchase.transaction_id).toEqualTypeOf<string>();
    expectTypeOf(product.lid).toEqualTypeOf<string>();
    expectTypeOf(listedPurchase.id).toEqualTypeOf<number>();
    expectTypeOf(listedPurchase.subscriber_id).toEqualTypeOf<number>();
    expectTypeOf(listedPurchase.source).toEqualTypeOf<string | undefined>();
    expectTypeOf(product.unit_price).toEqualTypeOf<number>();
    expect(result).toEqual(response);
    expect(listedPurchase.transaction_id).toBe("512-41-4101");
    expect(product.lid).toBe("000-13-0000");
    expect(listedPurchase.subscriber_id).toBe(13);
    expect(listedPurchase.source).toBe("Gumroad");
  });

  it("exposes the subscriber and source in a single purchase response", async () => {
    const response = {
      purchase: { ...purchase, id: 14, subscriber_id: 24 },
    } satisfies GetPurchase;
    fetchMock.mockResponseOnce(JSON.stringify(response));
    const kit = new Kit({
      apiKey: "oauth-token",
      authType: "oauth",
      maxRetries: 0,
    });
    const result = await kit.purchases.get(14);
    expect(result).toEqual(response);
    expectTypeOf(result!.purchase).toEqualTypeOf<Purchase>();
    expectTypeOf(result!.purchase.subscriber_id).toEqualTypeOf<number>();
    expectTypeOf(result!.purchase.source).toEqualTypeOf<string | undefined>();
    expect(result!.purchase.subscriber_id).toBe(24);
    expect(result!.purchase.source).toBe("Gumroad");
  });

  it("exposes the subscriber and app source in a created purchase response", async () => {
    const response = {
      purchase: {
        ...purchase,
        id: 22,
        subscriber_id: 42,
        source: "Fancy App 434",
      },
    } satisfies CreatePurchase;
    fetchMock.mockResponseOnce(JSON.stringify(response), { status: 201 });
    const kit = new Kit({
      apiKey: "oauth-token",
      authType: "oauth",
      maxRetries: 0,
    });
    const result = await kit.purchases.create({
      purchase: {
        email_address: purchase.email_address,
        transaction_id: purchase.transaction_id,
        currency: purchase.currency,
        products: purchase.products,
      },
    });
    expect(result).toEqual(response);
    expectTypeOf(result.purchase).toEqualTypeOf<Purchase>();
    expectTypeOf(result.purchase.subscriber_id).toEqualTypeOf<number>();
    expectTypeOf(result.purchase.source).toEqualTypeOf<string | undefined>();
    expect(result.purchase.subscriber_id).toBe(42);
    expect(result.purchase.source).toBe("Fancy App 434");
  });

  it("accepts listed purchases without a source", async () => {
    const withoutSource = {
      ...response,
      purchases: [purchaseWithoutSource],
    } satisfies ListPurchases;
    fetchMock.mockResponseOnce(JSON.stringify(withoutSource));
    const kit = new Kit({
      apiKey: "oauth-token",
      authType: "oauth",
      maxRetries: 0,
    });

    const result = await kit.purchases.list();
    expect(result).toEqual(withoutSource);
    expect(result.purchases[0]).not.toHaveProperty("source");
    expectTypeOf(result.purchases[0]!.source).toEqualTypeOf<
      string | undefined
    >();
  });

  it("accepts a single purchase without a source", async () => {
    const withoutSource = {
      purchase: purchaseWithoutSource,
    } satisfies GetPurchase;
    fetchMock.mockResponseOnce(JSON.stringify(withoutSource));
    const kit = new Kit({
      apiKey: "oauth-token",
      authType: "oauth",
      maxRetries: 0,
    });

    const result = await kit.purchases.get(purchaseWithoutSource.id);
    expect(result).toEqual(withoutSource);
    expect(result!.purchase).not.toHaveProperty("source");
    expectTypeOf(result!.purchase.source).toEqualTypeOf<string | undefined>();
  });

  it("accepts a created purchase without a source", async () => {
    const withoutSource = {
      purchase: purchaseWithoutSource,
    } satisfies CreatePurchase;
    fetchMock.mockResponseOnce(JSON.stringify(withoutSource), { status: 201 });
    const kit = new Kit({
      apiKey: "oauth-token",
      authType: "oauth",
      maxRetries: 0,
    });

    const result = await kit.purchases.create({
      purchase: {
        email_address: purchaseWithoutSource.email_address,
        transaction_id: purchaseWithoutSource.transaction_id,
        currency: purchaseWithoutSource.currency,
        products: purchaseWithoutSource.products,
      },
    });
    expect(result).toEqual(withoutSource);
    expect(result.purchase).not.toHaveProperty("source");
    expectTypeOf(result.purchase.source).toEqualTypeOf<string | undefined>();
  });
});

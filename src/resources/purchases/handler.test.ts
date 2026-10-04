import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { Kit, type ListPurchases } from "~/index";

// First purchase in Kit's documented list response:
// https://developers.kit.com/api-reference/purchases/list-purchases
const purchase = {
  id: 3,
  transaction_id: "512-41-4101",
  status: "paid",
  source: "Gumroad",
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
    expectTypeOf(listedPurchase.transaction_id).toEqualTypeOf<string>();
    expectTypeOf(product.lid).toEqualTypeOf<string>();
    expectTypeOf(listedPurchase.id).toEqualTypeOf<number>();
    expectTypeOf(product.unit_price).toEqualTypeOf<number>();
    expect(result).toEqual(response);
    expect(listedPurchase.transaction_id).toBe("512-41-4101");
    expect(product.lid).toBe("000-13-0000");
  });
});

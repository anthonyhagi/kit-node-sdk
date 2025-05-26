import type { Pagination } from "~/common/types";

export interface ListPurchasesParams {
  /**
   * Pass in the string from the previous request to move
   * the cursor. This can be found in the following field:
   *
   * @example after: pagination.end_cursor
   */
  after?: string | undefined;

  /**
   * Pass in the string from the previous request to move
   * the cursor. This can be found in the following field:
   *
   * @example after: pagination.start_cursor
   */
  before?: string | undefined;

  /**
   * To include the total count of records in the response,
   * use `true`. For large collections, expect a slightly
   * slower response.
   *
   * @example includeTotalCount: true
   */
  include_total_count?: boolean | undefined;

  /**
   * Number of results per page. Default 500, maximum 1000.
   *
   * @example perPage: 500
   */
  per_page?: number | undefined;
}

export interface ListPurchases {
  purchases: {
    id: number;
    transaction_id: number;
    status: string;
    email_address: string;
    currency: string;
    transaction_time: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    products: {
      quantity: number;
      lid: number;
      unit_price: number;
      sku: string | null;
      name: string;
      pid: string;
    }[];
  }[];
  pagination: Pagination;
}

export interface CreatePurchaseParams {
  purchase: {
    /**
     * The subscriber that the purchase belongs to.
     */
    email_address: string;

    /**
     * The first name of the subscriber.
     */
    first_name?: string | null | undefined;

    /**
     * A unique ID for the purchase.
     */
    transaction_id: string;
    status?: "paid" | (string & {}) | null | undefined;
    subtotal?: number | null | undefined;
    tax?: number | null | undefined;
    shipping?: number | null | undefined;
    discount?: number | null | undefined;
    total?: number | null | undefined;

    /**
     * The 3 letter country code of the currency.
     *
     * @example USD
     */
    currency: string;
    transaction_time?: Date | string | null | undefined;
    products: {
      /**
       * The product name displayed to the Subscriber.
       */
      name: string;

      /**
       * This is your identifier for a product. Each product provided in the
       * `products` array must have a unique pid. Variants of the same
       * product should have the same `pid`.
       */
      pid: string;

      /**
       * Each product should have a unique lid (i.e., line item identifier)
       * for this purchase.
       */
      lid: string;

      /**
       * Product quantity.
       */
      quantity: number;

      /**
       * Product sku.
       */
      sku?: string | null | undefined;

      /**
       * Product price.
       */
      unit_price: number;
    }[];
  };
}

export interface CreatePurchase {
  purchase: {
    id: number;
    transaction_id: string;
    status: string;
    email_address: string;
    currency: string;
    transaction_time: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    products: {
      quantity: number;
      lid: string;
      unit_price: number;
      sku: string | null;
      name: string;
      pid: string;
    }[];
  };
}

export interface GetPurchase {
  purchase: {
    id: number;
    transaction_id: string;
    status: string;
    email_address: string;
    currency: string;
    transaction_time: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    products: {
      quantity: number;
      lid: string;
      unit_price: number;
      sku: string | null;
      name: string;
      pid: string;
    }[];
  };
}

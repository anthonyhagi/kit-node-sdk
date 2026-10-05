import type { Pagination, PaginationParams } from "~/common/types";

export interface ListPurchasesParams extends PaginationParams {}

export interface ListPurchases {
  purchases: {
    id: number;
    transaction_id: string;
    status: string;
    subscriber_id: number;
    /** Purchase origin; not guaranteed to be included by Kit. */
    source?: string | undefined;
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
     * External transaction identifier. Reusing it updates the existing purchase
     * and appends the supplied products; it does not replace existing line items.
     */
    transaction_id: string;
    status?: "paid" | (string & {}) | null | undefined;
    subtotal?: number | null | undefined;
    tax?: number | null | undefined;
    shipping?: number | null | undefined;
    discount?: number | null | undefined;
    total?: number | null | undefined;

    /**
     * The 3-letter currency code.
     *
     * @example USD
     */
    currency: string;
    transaction_time?: Date | string | null | undefined;
    /**
     * Line items to add. For an existing transaction_id, include only products
     * that have not already been synced; resending them creates duplicates.
     */
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
    subscriber_id: number;
    /** Purchase origin; not guaranteed to be included by Kit. */
    source?: string | undefined;
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
    subscriber_id: number;
    /** Purchase origin; not guaranteed to be included by Kit. */
    source?: string | undefined;
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

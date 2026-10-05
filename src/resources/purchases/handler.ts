import type { Kit, RequestOptions } from "~/index";
import { paginationQuery } from "~/utils/pagination";
import type {
  CreatePurchase,
  CreatePurchaseParams,
  GetPurchase,
  ListPurchases,
  ListPurchasesParams,
} from "./types";

export class PurchasesHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Get a paginated list of all Purchases.
   *
   * @param params - Optional parameters to filter by.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/purchases/list-purchases}
   *
   * @returns The paginated list of Purchases.
   */
  public async list(
    params?: ListPurchasesParams,
    options?: RequestOptions
  ): Promise<ListPurchases> {
    const query = new URLSearchParams(paginationQuery(params));

    return await this.api.get<ListPurchases>("/purchases", {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Record a purchase or update one with the same transaction_id.
   *
   * Products are appended to an existing purchase, not replaced. Resending
   * the same products duplicates its line items; send only products that
   * have not already been synced for this transaction_id.
   * If the email address has no subscriber, Kit creates an active subscriber.
   * Automatic retries default to 0 to avoid duplicating products after an
   * uncertain outcome. Request options can explicitly override this limit.
   *
   * @param params - The required details to record a Purchase.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/purchases/create-a-purchase}
   *
   * @returns The recorded Purchase for a Subscriber.
   */
  public async create(
    params: CreatePurchaseParams,
    options?: RequestOptions
  ): Promise<CreatePurchase> {
    const body = JSON.stringify(params || {});

    return await this.api.post<CreatePurchase>("/purchases", {
      body,
      signal: options?.signal,
      maxRetries: options?.maxRetries ?? 0,
    });
  }

  /**
   * Get a unique Purchase.
   *
   * @param id - The unique ID of the Purchase.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/purchases/get-a-purchase}
   *
   * @returns The unique Purchase.
   */
  public async get(
    id: number,
    options?: RequestOptions
  ): Promise<GetPurchase | null> {
    return await this.api.get<GetPurchase | null>(`/purchases/${id}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

import type { Kit } from "~/index";
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
   *
   * @see {@link https://developers.kit.com/api-reference/purchases/list-purchases}
   *
   * @returns The paginated list of Purchases.
   */
  public async list(params?: ListPurchasesParams): Promise<ListPurchases> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListPurchases>("/purchases", { query });
  }

  /**
   * Create a new Purchase for a Subscriber.
   *
   * @param params - The required details to record a Purchase.
   *
   * @see {@link https://developers.kit.com/api-reference/purchases/create-a-purchase}
   *
   * @returns The created Purchase for a Subscriber.
   */
  public async create(params: CreatePurchaseParams): Promise<CreatePurchase> {
    const body = JSON.stringify(params || {});

    return await this.api.post<CreatePurchase>("/purchases", { body });
  }

  /**
   * Get a unique Purchase.
   *
   * @param id - The unique ID of the Purchase.
   *
   * @see {@link https://developers.kit.com/api-reference/purchases/get-a-purchase}
   *
   * @returns The unique Purchase.
   */
  public async get(id: number): Promise<GetPurchase | null> {
    return await this.api.get<GetPurchase | null>(`/purchases/${id}`);
  }
}

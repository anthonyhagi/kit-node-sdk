import type { Kit, RequestOptions } from "~/index";
import type { ListKitFields } from "./types";

export class KitFieldsHandler {
  constructor(private api: Kit) {}

  /**
   * List the Kit Fields that Subscriber Signals knows about each subscriber,
   * such as job title, social profiles and demographics. Returns definitions
   * only, not subscriber values. Requires Subscriber Signals on a paid Pro plan.
   *
   * @param options - Optional request controls, including cancellation.
   * @returns Each field's name, data type, and fixed options where they exist.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response, including
   * 422 for accounts without Subscriber Signals on a paid Pro plan.
   *
   * @see {@link https://developers.kit.com/api-reference/kit-fields/list-kit-fields}
   */
  public async list(options?: RequestOptions): Promise<ListKitFields> {
    return await this.api.get<ListKitFields>("/kit_fields", {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

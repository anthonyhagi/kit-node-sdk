import type { Kit, RequestOptions } from "~/index";
import type {
  ListKitFields,
  UpdateSubscriberKitFields,
  UpdateSubscriberKitFieldsParams,
} from "./types";

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

  /**
   * Correct a subscriber's Kit Field values. Only the named fields change.
   * Setting a field to `null` removes the value written through the API and
   * leaves values from other sources in place. Requires Subscriber Signals on
   * a paid Pro plan.
   *
   * @param subscriberId - The unique ID of the subscriber.
   * @param params - `kit_fields`, mapping at least one field name from
   * {@link KitFieldsHandler.list} to its value or `null`.
   * @param options - Optional request controls, including cancellation.
   * @returns The subscriber's ID and all of their current Kit Field values.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response, including
   * 422 when a value doesn't fit its field.
   *
   * @see {@link https://developers.kit.com/api-reference/kit-fields/update-a-subscribers-kit-fields}
   *
   * @example Correcting a subscriber's Kit Fields
   * ```typescript
   * const { subscriber } = await kit.kitFields.updateSubscriberValues(130, {
   *   kit_fields: { gender: "female", age: 34, job_title: null },
   * });
   * ```
   */
  public async updateSubscriberValues(
    subscriberId: number,
    params: UpdateSubscriberKitFieldsParams,
    options?: RequestOptions
  ): Promise<UpdateSubscriberKitFields> {
    return await this.api.patch<UpdateSubscriberKitFields>(
      `/subscribers/${subscriberId}/kit_fields`,
      {
        body: JSON.stringify(params),
        signal: options?.signal,
        maxRetries: options?.maxRetries,
      }
    );
  }
}

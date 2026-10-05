import type { Kit, RequestOptions } from "~/index";
import { toDateOnlyString } from "~/utils/date";
import type {
  AddSubscriberToForm,
  AddSubscriberToFormByEmail,
  AddSubscriberToFormByEmailParams,
  AddSubscriberToFormParams,
  BulkAddSubscribers,
  BulkAddSubscribersParams,
  BulkAddSubscribersWithoutResponseType,
  ListForms,
  ListFormsParams,
  ListFormSubscribers,
  ListFormSubscribersParams,
  ListSlimFormSubscribers,
} from "./types";

export class FormsHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Add subscribers to a form in bulk.
   *
   * @remarks When 100 or less subscribers are requested to be added, this
   * request runs synchronously on the remote API. For over 100, it is run
   * asynchronously and only returns an empty response.
   *
   * When adding more than 100 subscribers, it's recommended to set the
   * callback URL. This will notify you of any failures in processing.
   *
   * @param params - The required fields to run this request.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/forms/bulk-add-subscribers-to-forms}
   *
   * @returns a response with the list of subscribers and any failures
   * that may have occurred. For over 100 subscribers, an empty
   * object will be returned.
   */
  public async bulkAddSubscribers(
    params: BulkAddSubscribersParams,
    options?: RequestOptions
  ): Promise<BulkAddSubscribers> {
    const body = JSON.stringify(params || {});
    const url = "/bulk/forms/subscribers";

    const resp = await this.api.post<BulkAddSubscribersWithoutResponseType>(
      url,
      { body, signal: options?.signal }
    );

    // Add on the response type such that the caller of this method
    // understands the result. This ensures that type hinting
    // works as expected for a synchronous result, and that
    // asynchronous results don't show anything.
    if ("subscribers" in resp) {
      return { type: "synchronous", ...resp };
    }

    return { type: "asynchronous", ...resp };
  }

  /**
   * Get a paginated list of all forms and landing pages (embedded and
   * hosted) for your account (including active and archived).
   *
   * @param params - Optional filters to apply.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/forms/list-forms}
   *
   * @returns the paginated list of all forms and landing pages.
   */
  public async list(
    params?: ListFormsParams,
    options?: RequestOptions
  ): Promise<ListForms> {
    const {
      after,
      before,
      include,
      include_total_count,
      per_page,
      status,
      type,
    } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include && { include }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
      ...(status && { status }),
      ...(type && { type }),
    });

    return await this.api.get<ListForms>("/forms", {
      query,
      signal: options?.signal,
    });
  }

  /**
   * Get a paginated list of all subscribers attached to a form.
   *
   * @param id - The unique ID of the form.
   * @param params - The optional filters to apply.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/forms/list-subscribers-for-a-form}
   *
   * @returns the paginated list of subscribers attached to the form.
   */
  public async listSubscribers(
    id: number,
    params: ListFormSubscribersParams & { slim: true },
    options?: RequestOptions
  ): Promise<ListSlimFormSubscribers | null>;
  public async listSubscribers(
    id: number,
    params?: ListFormSubscribersParams & { slim?: false | undefined },
    options?: RequestOptions
  ): Promise<ListFormSubscribers | null>;
  public async listSubscribers(
    id: number,
    params?: ListFormSubscribersParams,
    options?: RequestOptions
  ): Promise<ListFormSubscribers | ListSlimFormSubscribers | null>;
  public async listSubscribers(
    id: number,
    params?: ListFormSubscribersParams,
    options?: RequestOptions
  ): Promise<ListFormSubscribers | ListSlimFormSubscribers | null> {
    const {
      added_after,
      added_before,
      after,
      before,
      created_after,
      created_before,
      include_total_count,
      per_page,
      slim,
      status,
    } = params || {};

    const url = `/forms/${id}/subscribers`;
    const query = new URLSearchParams({
      ...(added_after && { added_after: toDateOnlyString(added_after) }),
      ...(added_before && { added_before: toDateOnlyString(added_before) }),
      ...(after && { after }),
      ...(before && { before }),
      ...(created_after && { created_after: toDateOnlyString(created_after) }),
      ...(created_before && {
        created_before: toDateOnlyString(created_before),
      }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
      ...(slim !== undefined && { slim: String(slim) }),
      ...(status && { status }),
    });

    return await this.api.get<
      ListFormSubscribers | ListSlimFormSubscribers | null
    >(url, { query, signal: options?.signal });
  }

  /**
   * Adds the subscriber to the specified form.
   *
   * @remarks This subscriber MUST exist in the remote API otherwise
   * this call will fail.
   *
   * @param id - The unique ID of the form to add the subscriber to.
   * @param params - The required and optional parameters to add
   * the subscriber.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address}
   *
   * @returns The subscribers' details after being added to the form.
   */
  public async addSubscriberByEmail(
    id: number,
    params: AddSubscriberToFormByEmailParams,
    options?: RequestOptions
  ): Promise<AddSubscriberToFormByEmail | null> {
    const { email_address, referrer } = params || {};

    const body = JSON.stringify({
      email_address,
      ...(referrer !== undefined && { referrer }),
    });

    const url = `/forms/${id}/subscribers`;

    return await this.api.post<AddSubscriberToFormByEmail | null>(url, {
      body,
      signal: options?.signal,
    });
  }

  /**
   * Add a subscriber to a form by the subscribers' ID.
   *
   * @param formId - The unique ID of the form to add the subscriber to.
   * @param subscriberId - The unique ID of the subscriber.
   * @param params - Optional parameters to specify when adding the
   * Subscriber.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/forms/add-subscriber-to-form}
   *
   * @returns The subscribers' details after being added to the form.
   */
  public async addSubscriber(
    formId: number,
    subscriberId: number,
    params?: AddSubscriberToFormParams,
    options?: RequestOptions
  ): Promise<AddSubscriberToForm | null> {
    const body = JSON.stringify(params || {});

    const url = `/forms/${formId}/subscribers/${subscriberId}`;

    return await this.api.post<AddSubscriberToForm | null>(url, {
      body,
      signal: options?.signal,
    });
  }
}

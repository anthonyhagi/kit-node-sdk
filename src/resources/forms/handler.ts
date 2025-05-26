import type { Kit } from "~/index";
import { toDateString } from "~/utils/date";
import type {
  AddSubscriber,
  AddSubscriberByEmail,
  AddSubscriberByEmailParams,
  AddSubscriberParams,
  BulkAddSubscribers,
  BulkAddSubscribersParams,
  BulkAddSubscribersWithoutResponseType,
  ListForms,
  ListFormsParams,
  ListSubscribers,
  ListSubscribersParams,
} from "./types";

export class FormsHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Add subscribers to a form in bulk.
   *
   * When 100 or less subscribers are requested to be added, this request
   * runs synchronously on the remote API. For over 100, it is run
   * asynchronously and only returns an empty response.
   *
   * When adding more than 100 subscribers, it's recommended to set the
   * callback URL. This will notify you of any failures in processing.
   *
   * @param params the required fields to run this request.
   * @param params.additions the subscribers to add to forms.
   * @param params.callback_url the URL the api will trigger after
   * processing an asynchronous request (> 100 subscribers need to
   * be added).
   *
   * @returns a response with the list of subscribers and any failures
   * that may have occurred. For over 100 subscribers, an empty
   * object will be returned.
   */
  public async bulkAddSubscribers(
    params: BulkAddSubscribersParams
  ): Promise<BulkAddSubscribers> {
    const body = JSON.stringify(params || {});
    const url = "/bulk/forms/subscribers";

    const resp = await this.api.post<BulkAddSubscribersWithoutResponseType>(
      url,
      { body }
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
   * @param params
   *
   * @returns the paginated list of all forms and landing pages.
   */
  public async list(params?: ListFormsParams): Promise<ListForms> {
    const { after, before, includeTotalCount, perPage, status, type } =
      params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(includeTotalCount && {
        include_total_count: String(includeTotalCount),
      }),
      ...(perPage && { per_page: String(perPage) }),
      ...(status && { status }),
      ...(type && { type }),
    });

    return await this.api.get<ListForms>("/forms", { query });
  }

  /**
   * Get a paginated list of all subscribers attached to a form.
   *
   * @param id The unique ID of the form.
   * @param params
   *
   * @returns the paginated list of subscribers attached to the form.
   */
  public async listSubscribers(
    id: number,
    params?: ListSubscribersParams
  ): Promise<ListSubscribers | null> {
    const {
      addedAfter,
      addedBefore,
      after,
      before,
      createdAfter,
      createdBefore,
      includeTotalCount,
      perPage,
      status,
    } = params || {};

    const url = `/forms/${id}/subscribers`;
    const query = new URLSearchParams({
      ...(addedAfter && { added_after: toDateString(addedAfter) }),
      ...(addedBefore && { added_before: toDateString(addedBefore) }),
      ...(after && { after }),
      ...(before && { before }),
      ...(createdAfter && { created_after: toDateString(createdAfter) }),
      ...(createdBefore && { created_before: toDateString(createdBefore) }),
      ...(includeTotalCount && {
        include_total_count: String(includeTotalCount),
      }),
      ...(perPage && { per_page: String(perPage) }),
      ...(status && { status }),
    });

    return await this.api.get<ListSubscribers | null>(url, { query });
  }

  /**
   * Adds the subscriber to the specified form.
   *
   * @param id The unique ID of the form to add the subscriber to.
   * @param params The required parameters to add the subscriber.
   * @param params.emailAddress The subscribers' email address.
   * This subscriber MUST exist in the remote API otherwise
   * this call will fail.
   * @param params.referrer The URL of the referrer if applicable.
   *
   * @returns The subscribers' details after being added to the form.
   */
  public async addSubscriberByEmail(
    id: number,
    params: AddSubscriberByEmailParams
  ): Promise<AddSubscriberByEmail | null> {
    const { emailAddress, referrer } = params || {};

    const body = JSON.stringify({
      email_address: emailAddress,
      ...(referrer && { referrer }),
    });

    const url = `/forms/${id}/subscribers`;

    return await this.api.post<AddSubscriberByEmail | null>(url, { body });
  }

  /**
   * Add a subscriber to a form by the subscribers' ID.
   *
   * @param id The unique ID of the form to add the subscriber to.
   * @param subscriberId The unique ID of the subscriber.
   * @param params
   *
   * @returns The subscribers' details after being added to the form.
   */
  public async addSubscriber(
    id: number,
    subscriberId: number,
    params: AddSubscriberParams
  ): Promise<AddSubscriber | null> {
    const { referrer } = params;

    const body = JSON.stringify({ referrer });

    const url = `/forms/${id}/subscribers/${subscriberId}`;

    return await this.api.post<AddSubscriber | null>(url, { body });
  }
}

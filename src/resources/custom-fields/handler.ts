import type { Kit } from "~/index";
import type {
  BulkCreate,
  BulkCreateParams,
  BulkCreateWithoutResponseType,
  CreateCustomField,
  CreateCustomFieldParams,
  ListCustomFields,
  ListCustomFieldsParams,
  UpdateCustomField,
  UpdateCustomFieldParams,
} from "./types";

export class CustomFieldsHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Create the specified custom fields in bulk.
   *
   * @remarks When 100 or less fields are requested to be created, this
   * request runs synchronously on the remote API. For over 100, it is
   * run asynchronously and only returns an empty response.
   *
   * When creating more than 100 fields, it's recommended to set the
   * callback URL. This will notify you of any failures in processing.
   *
   * @param params - The required fields to run this request.
   *
   * @see {@link https://developers.kit.com/api-reference/custom-fields/bulk-create-custom-fields}
   *
   * @returns a response with the custom fields created and any
   * failures that may have occurred. For over 100 fields,
   * an empty object will be returned.
   */
  public async bulkCreate(params: BulkCreateParams): Promise<BulkCreate> {
    const body = JSON.stringify(params || {});
    const url = "/bulk/custom_fields";

    const resp = await this.api.post<BulkCreateWithoutResponseType>(url, {
      body,
    });

    // Add on the response type such that the caller of this method
    // understands the result. This ensures that type hinting
    // works as expected for a synchronous result, and that
    // asynchronous results don't show anything.
    if ("custom_fields" in resp) {
      return { type: "synchronous", ...resp };
    }

    return { type: "asynchronous", ...resp };
  }

  /**
   * Retrieve all custom fields attached to your account.
   *
   * @remarks A custom field allows you to collect subscriber information
   * beyond the standard fields of `first_name` and `email_address`.
   *
   * An example would be a custom field called `last_name`, so you
   * can get the full name of your subscribers.
   *
   * You create a custom field, and then you're able to use that in
   * your forms or emails.
   *
   * @param params - The optional filtering to apply to the request.
   *
   * @see {@link https://developers.kit.com/api-reference/custom-fields/list-custom-fields}
   *
   * @returns a paginated list of all custom fields.
   */
  public async list(
    params?: ListCustomFieldsParams
  ): Promise<ListCustomFields> {
    const { after, before, include_total_count, per_page } = params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    const url = "/custom_fields";

    return await this.api.get<ListCustomFields>(url, { query });
  }

  /**
   * Create a custom field for your account.
   *
   * @remarks The label field must be unique to your account. Whitespace
   * will be removed from the beginning and the end of your label.
   *
   * Additionally, a `key` field and a `name` field will be generated
   * for you. The key is an ASCII-only, lowercased, underscored
   * representation of your label.
   *
   * This key must be unique to your account. Keys are used in
   * personalization tags in sequences and broadcasts. Names
   * are unique identifiers for use in the HTML of custom
   * forms. They are made up of a combination of ID and
   * the key of the custom field prefixed with `ck_field`.
   *
   * @param params - The required fields to create a new Custom Field.
   *
   * @see {@link https://developers.kit.com/api-reference/custom-fields/create-a-custom-field}
   *
   * @returns the newly created custom field.
   */
  public async create(
    params: CreateCustomFieldParams
  ): Promise<CreateCustomField> {
    const body = JSON.stringify(params || {});
    const url = "/custom_fields";

    return await this.api.post<CreateCustomField>(url, { body });
  }

  /**
   * Delete the custom field.
   *
   * This will remove all data in this field from your subscribers.
   *
   * @param id - The unique ID of the custom field.
   *
   * @see {@link https://developers.kit.com/api-reference/custom-fields/delete-custom-field}
   *
   * @returns an empty object when deleted successfully; `null` if
   * the custom field was not found.
   */
  public async delete(id: number): Promise<{} | null> {
    const url = `/custom_fields/${id}`;

    return await this.api.delete<{} | null>(url);
  }

  /**
   * Update the custom field and return the updated details.
   *
   * Note that the key will change but the name remains the same when
   * the label is updated.
   *
   * Warning: An update to a custom field will break all of the
   * liquid personalization tags in emails that reference it.
   *
   * e.g. if you update a `Zip_Code` custom field to `Post_Code`,
   * all liquid tags referencing `{{ subscriber.Zip_Code }}`
   * would no longer work and need to be replaced with
   * `{{ subscriber.Post_Code }}`.
   *
   * @param id - The unique ID of the custom field.
   * @param params - The details to update to.
   *
   * @see {@link https://developers.kit.com/api-reference/custom-fields/update-a-custom-field}
   *
   * @returns the updated custom field; `null` if the custom
   * field was not found.
   */
  public async update(
    id: number,
    params: UpdateCustomFieldParams
  ): Promise<UpdateCustomField | null> {
    const body = JSON.stringify(params || {});
    const url = `/custom_fields/${id}`;

    return await this.api.put<UpdateCustomField | null>(url, { body });
  }
}

import type { Kit, RequestOptions } from "~/index";
import { toDateOnlyString } from "~/utils/date";
import { paginationQuery } from "~/utils/pagination";
import type {
  AddSubscriberByEmailParams,
  AddSubscriberToSequence,
  CreateSequence,
  CreateSequenceParams,
  GetSequence,
  GetSequenceParams,
  GetSequenceWithStats,
  ListSequences,
  ListSequencesParams,
  ListSequenceSubscribers,
  ListSequenceSubscribersParams,
  ListSequencesWithStats,
  UpdateSequence,
  UpdateSequenceParams,
} from "./types";

export class SequencesHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Get a paginated list of all Sequences.
   *
   * @param params - Optional pagination and stats inclusion parameters.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/list-sequences}
   *
   * @returns The paginated list of Sequences.
   */
  public async list(
    params: ListSequencesParams & { include: "stats" },
    options?: RequestOptions
  ): Promise<ListSequencesWithStats>;
  public async list(
    params?: ListSequencesParams & { include?: undefined },
    options?: RequestOptions
  ): Promise<ListSequences>;
  public async list(
    params?: ListSequencesParams,
    options?: RequestOptions
  ): Promise<ListSequences | ListSequencesWithStats>;
  public async list(
    params?: ListSequencesParams,
    options?: RequestOptions
  ): Promise<ListSequences | ListSequencesWithStats> {
    const { include } = params || {};

    const query = new URLSearchParams({
      ...paginationQuery(params),
      ...(include && { include }),
    });

    return await this.api.get<ListSequences>("/sequences", {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Create an empty sequence. Only the name is required; Kit supplies defaults.
   *
   * @param params - The name and optional sending settings and exclusions.
   * @param options - Optional request controls, including cancellation.
   * @returns The created sequence details.
   * @see {@link https://developers.kit.com/api-reference/sequences/create-a-sequence}
   */
  public async create(
    params: CreateSequenceParams,
    options?: RequestOptions
  ): Promise<CreateSequence> {
    return await this.api.post<CreateSequence>("/sequences", {
      body: JSON.stringify(params),
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Fetch a sequence's settings, schedule, and optional deliverability stats.
   *
   * @param id - The unique ID of the sequence.
   * @param params - Optional data to include in the response.
   * @param options - Optional request controls, including cancellation.
   * @returns The sequence details.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/get-a-sequence}
   */
  public async get(
    id: number,
    params: GetSequenceParams & { include: "stats" },
    options?: RequestOptions
  ): Promise<GetSequenceWithStats>;
  public async get(
    id: number,
    params?: GetSequenceParams & { include?: undefined },
    options?: RequestOptions
  ): Promise<GetSequence>;
  public async get(
    id: number,
    params?: GetSequenceParams,
    options?: RequestOptions
  ): Promise<GetSequence | GetSequenceWithStats>;
  public async get(
    id: number,
    params?: GetSequenceParams,
    options?: RequestOptions
  ): Promise<GetSequence | GetSequenceWithStats> {
    const query = new URLSearchParams({
      ...(params?.include && { include: params.include }),
    });
    return await this.api.get<GetSequence>(`/sequences/${id}`, {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Update only the supplied sequence settings, preserving omitted fields.
   *
   * @param id - The unique ID of the sequence.
   * @param params - The settings to change.
   * @param options - Optional request controls, including cancellation.
   * @returns The updated sequence.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/update-a-sequence}
   */
  public async update(
    id: number,
    params: UpdateSequenceParams,
    options?: RequestOptions
  ): Promise<UpdateSequence> {
    return await this.api.put<UpdateSequence>(`/sequences/${id}`, {
      body: JSON.stringify(params),
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Soft-delete a sequence, stopping active deliveries immediately.
   * Associated state is cleaned up in the background.
   *
   * @param id - The unique ID of the sequence.
   * @param options - Optional request controls, including cancellation.
   * @returns Resolves without a value on success.
   * @throws {ApiError} If Kit returns an unsuccessful HTTP response.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/delete-a-sequence}
   */
  public async delete(id: number, options?: RequestOptions): Promise<void> {
    await this.api.delete<void>(`/sequences/${id}`, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Get a paginated list of all Subscribers for a Sequence.
   *
   * @param id - The unique ID of the Sequence.
   * @param params - Optional parameters to filter by.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/list-subscribers-for-a-sequence}
   *
   * @returns The paginated list of Subscribers for a Sequence.
   */
  public async listSubscribers(
    id: number,
    params?: ListSequenceSubscribersParams,
    options?: RequestOptions
  ): Promise<ListSequenceSubscribers> {
    const { added_after, added_before, created_after, created_before, status } =
      params || {};

    const query = new URLSearchParams({
      ...(added_after && { added_after: toDateOnlyString(added_after) }),
      ...(added_before && { added_before: toDateOnlyString(added_before) }),
      ...paginationQuery(params),
      ...(created_after && { created_after: toDateOnlyString(created_after) }),
      ...(created_before && {
        created_before: toDateOnlyString(created_before),
      }),
      ...(status && { status }),
    });

    const url = `/sequences/${id}/subscribers`;

    return await this.api.get<ListSequenceSubscribers>(url, {
      query,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Add a Subscriber to a Sequence by their email address.
   *
   * @param id - The unique ID of the Sequence.
   * @param params - The email address of the Subscriber to add.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/add-subscriber-to-sequence-by-email-address}
   *
   * @returns The Subscribers' details after being added to the Sequence.
   */
  public async addSubscriberByEmail(
    id: number,
    params: AddSubscriberByEmailParams,
    options?: RequestOptions
  ): Promise<AddSubscriberToSequence> {
    const body = JSON.stringify(params || {});

    const url = `/sequences/${id}/subscribers`;

    return await this.api.post<AddSubscriberToSequence>(url, {
      body,
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }

  /**
   * Add a Subscriber to a Sequence by ID.
   *
   * @param sequenceId - The unique ID of the Sequence.
   * @param subscriberId - The unique ID of the Subscriber.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/add-subscriber-to-sequence}
   *
   * @returns The Subscribers' details after being added to the Sequence.
   */
  public async addSubscriberById(
    sequenceId: number,
    subscriberId: number,
    options?: RequestOptions
  ): Promise<AddSubscriberToSequence> {
    const url = `/sequences/${sequenceId}/subscribers/${subscriberId}`;

    return await this.api.post<AddSubscriberToSequence>(url, {
      signal: options?.signal,
      maxRetries: options?.maxRetries,
    });
  }
}

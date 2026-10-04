import type { Kit } from "~/index";
import { toDateString } from "~/utils/date";
import type {
  AddSubscriberByEmailParams,
  AddSubscriberToSequence,
  CreateSequence,
  CreateSequenceParams,
  GetSequence,
  GetSequenceParams,
  ListSequences,
  ListSequencesParams,
  ListSequenceSubscribers,
  ListSequenceSubscribersParams,
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
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/list-sequences}
   *
   * @returns The paginated list of Sequences.
   */
  public async list(params?: ListSequencesParams): Promise<ListSequences> {
    const { after, before, include, include_total_count, per_page } =
      params || {};

    const query = new URLSearchParams({
      ...(after && { after }),
      ...(before && { before }),
      ...(include && { include }),
      ...(include_total_count !== undefined && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
    });

    return await this.api.get<ListSequences>("/sequences", { query });
  }

  /**
   * Create an empty sequence. Only the name is required; Kit supplies defaults.
   *
   * @param params - The name and optional sending settings and exclusions.
   * @returns The created sequence details.
   * @see {@link https://developers.kit.com/api-reference/sequences/create-a-sequence}
   */
  public async create(params: CreateSequenceParams): Promise<CreateSequence> {
    return await this.api.post<CreateSequence>("/sequences", {
      body: JSON.stringify(params),
    });
  }

  /**
   * Fetch a sequence's settings, schedule, and optional deliverability stats.
   *
   * @param id - The unique ID of the sequence.
   * @param params - Optional data to include in the response.
   * @returns The sequence details, or null if the sequence was not found.
   * @see {@link https://developers.kit.com/api-reference/sequences/get-a-sequence}
   */
  public async get(
    id: number,
    params?: GetSequenceParams
  ): Promise<GetSequence | null> {
    const query = new URLSearchParams({
      ...(params?.include && { include: params.include }),
    });
    return await this.api.get<GetSequence | null>(`/sequences/${id}`, {
      query,
    });
  }

  /**
   * Update only the supplied sequence settings, preserving omitted fields.
   *
   * @param id - The unique ID of the sequence.
   * @param params - The settings to change.
   * @returns The updated sequence, or null if it was not found.
   * @see {@link https://developers.kit.com/api-reference/sequences/update-a-sequence}
   */
  public async update(
    id: number,
    params: UpdateSequenceParams
  ): Promise<UpdateSequence | null> {
    return await this.api.put<UpdateSequence | null>(`/sequences/${id}`, {
      body: JSON.stringify(params),
    });
  }

  /**
   * Soft-delete a sequence, stopping active deliveries immediately.
   * Associated state is cleaned up in the background.
   *
   * @param id - The unique ID of the sequence.
   * @returns An empty object on success, or null if the sequence was not found.
   * @see {@link https://developers.kit.com/api-reference/sequences/delete-a-sequence}
   */
  public async delete(id: number): Promise<{} | null> {
    return await this.api.delete<{} | null>(`/sequences/${id}`);
  }

  /**
   * Get a paginated list of all Subscribers for a Sequence.
   *
   * @param id - The unique ID of the Sequence.
   * @param params - Optional parameters to filter by.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/list-subscribers-for-a-sequence}
   *
   * @returns The paginated list of Subscribers for a Sequence.
   */
  public async listSubscribers(
    id: number,
    params?: ListSequenceSubscribersParams
  ): Promise<ListSequenceSubscribers | null> {
    const {
      added_after,
      added_before,
      after,
      before,
      created_after,
      created_before,
      include_total_count,
      per_page,
      status,
    } = params || {};

    const query = new URLSearchParams({
      ...(added_after && { added_after: toDateString(added_after) }),
      ...(added_before && { added_before: toDateString(added_before) }),
      ...(after && { after }),
      ...(before && { before }),
      ...(created_after && { created_after: toDateString(created_after) }),
      ...(created_before && { created_before: toDateString(created_before) }),
      ...(include_total_count && {
        include_total_count: String(include_total_count),
      }),
      ...(per_page && { per_page: String(per_page) }),
      ...(status && { status }),
    });

    const url = `/sequences/${id}/subscribers`;

    return await this.api.get<ListSequenceSubscribers | null>(url, { query });
  }

  /**
   * Add a Subscriber to a Sequence by their email address.
   *
   * @param id - The unique ID of the Sequence.
   * @param params - The email address of the Subscriber to add.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/add-subscriber-to-sequence-by-email-address}
   *
   * @returns The Subscribers' details after being added to the Sequence.
   */
  public async addSubscriberByEmail(
    id: number,
    params: AddSubscriberByEmailParams
  ): Promise<AddSubscriberToSequence | null> {
    const body = JSON.stringify(params || {});

    const url = `/sequences/${id}/subscribers`;

    return await this.api.post<AddSubscriberToSequence | null>(url, { body });
  }

  /**
   * Add a Subscriber to a Sequence by ID.
   *
   * @param sequenceId - The unique ID of the Sequence.
   * @param subscriberId - The unique ID of the Subscriber.
   *
   * @see {@link https://developers.kit.com/api-reference/sequences/add-subscriber-to-sequence}
   *
   * @returns The Subscribers' details after being added to the Sequence.
   */
  public async addSubscriberById(
    sequenceId: number,
    subscriberId: number
  ): Promise<AddSubscriberToSequence | null> {
    const url = `/sequences/${sequenceId}/subscribers/${subscriberId}`;

    return await this.api.post<AddSubscriberToSequence | null>(url);
  }
}

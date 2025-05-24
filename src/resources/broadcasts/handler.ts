import type { Kit } from "~/index";
import type { GetBroadcast } from "./types";

export class BroadcastsHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  public async listBroadcasts() {
    return await this.api.get("/broadcasts");
  }

  public async createBroadcast() {}

  public async getLinkClicks(id: number) {
    return await this.api.get(`/broadcasts/${id}/clicks`);
  }

  public async getStatsForBroadcast(id: number) {
    return await this.api.get(`/broadcasts/${id}/stats`);
  }

  public async deleteBroadcast(id: number): Promise<void> {
    return await this.api.delete<undefined>(`/broadcasts/${id}`);
  }

  public async getBroadcast(id: number): Promise<GetBroadcast | null> {
    return await this.api.get<GetBroadcast | null>(`/broadcasts/${id}`);
  }
}

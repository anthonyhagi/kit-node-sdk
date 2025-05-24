import type { Kit } from "~/index";
import type {
  GetCreatorProfile,
  GetCurrentAccount,
  GetEmailStats,
  GetGrowthStats,
  GetGrowthStatsParams,
  ListColors,
} from "./types";

export class AccountsHandler {
  private api: Kit;

  constructor(api: Kit) {
    this.api = api;
  }

  /**
   * Returns the current account and associated user information.
   *
   * @returns the user and account information.
   */
  public async getCurrentAccount(): Promise<GetCurrentAccount> {
    return await this.api.get<GetCurrentAccount>("/account");
  }

  public async listColors(): Promise<ListColors> {
    return await this.api.get<ListColors>("/account/colors");
  }

  public updateColors() {}

  public async getCreatorProfile(): Promise<GetCreatorProfile> {
    return await this.api.get<GetCreatorProfile>("/account/creator_profile");
  }

  public async getEmailStats(): Promise<GetEmailStats> {
    return await this.api.get<GetEmailStats>("/account/email_stats");
  }

  public async getGrowthStats(
    params?: GetGrowthStatsParams
  ): Promise<GetGrowthStats> {
    const { starting, ending } = params || {};

    const query = new URLSearchParams();

    if (starting != null && starting !== "") {
      const value =
        starting instanceof Date
          ? starting.toISOString().split("T")[0]!
          : starting;

      query.append("starting", value);
    }

    if (ending) {
      const value =
        ending instanceof Date ? ending.toISOString().split("T")[0]! : ending;

      query.append("ending", value);
    }

    return await this.api.get<GetGrowthStats>("/account/growth_stats", {
      query,
    });
  }
}

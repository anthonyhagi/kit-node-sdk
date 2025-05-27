import type { Kit } from "~/index";
import type {
  GetCreatorProfile,
  GetCurrentAccount,
  GetEmailStats,
  GetGrowthStats,
  GetGrowthStatsParams,
  ListColors,
  UpdateColors,
  UpdateColorsParams,
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
   * @see {@link https://developers.kit.com/v4#get-current-account}
   */
  public async getCurrentAccount(): Promise<GetCurrentAccount> {
    return await this.api.get<GetCurrentAccount>("/account");
  }

  /**
   * Returns list of colors for the current account.
   *
   * @returns a list of colors as hex strings in an array.
   * @see {@link https://developers.kit.com/v4#list-colors}
   */
  public async listColors(): Promise<ListColors> {
    return await this.api.get<ListColors>("/account/colors");
  }

  /**
   * Update and return the newly set colors.
   *
   * @param params the required parameters to send.
   * @param params.colors The hex colours to set on the account.
   *
   * @returns the newly set list of hex colours in an array.
   * @see {@link https://developers.kit.com/v4#update-colors}
   */
  public async updateColors(params: UpdateColorsParams): Promise<UpdateColors> {
    const { colors = [] } = params;

    if (colors.length === 0) {
      throw new Error(
        "Cannot update colors to an empty list. Please enter up to 5 different hex colors"
      );
    } else if (colors.length > 5) {
      throw new Error(
        "Cannot update colors with more than 5 colors specified. Please specify between 1 and 5 different colors to update to"
      );
    }

    return await this.api.put<UpdateColors>("/account/colors", {
      body: JSON.stringify({ colors }),
    });
  }

  /**
   * Returns the Creator Profile details.
   *
   * @returns the details stored on the current profile.
   * @see {@link https://developers.kit.com/v4#get-creator-profile}
   */
  public async getCreatorProfile(): Promise<GetCreatorProfile> {
    return await this.api.get<GetCreatorProfile>("/account/creator_profile");
  }

  /**
   * Returns your email stats for the last 90 days.
   *
   * @returns the basic email statistics over the last 90 days.
   * @see {@link https://developers.kit.com/v4#get-email-stats}
   */
  public async getEmailStats(): Promise<GetEmailStats> {
    return await this.api.get<GetEmailStats>("/account/email_stats");
  }

  /**
   * Returns your growth stats for the provided starting and ending dates.
   *
   * @param params the optional starting and ending dates to search between.
   *
   * @returns the growth stats as reported between the start and end dates.
   * @see {@link https://developers.kit.com/v4#get-growth-stats}
   */
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

    if (ending != null && ending !== "") {
      const value =
        ending instanceof Date ? ending.toISOString().split("T")[0]! : ending;

      query.append("ending", value);
    }

    return await this.api.get<GetGrowthStats>("/account/growth_stats", {
      query,
    });
  }
}

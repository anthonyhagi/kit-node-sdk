import type { Kit } from "~/index";
import { toDateString } from "~/utils/date";
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
   * @see {@link https://developers.kit.com/v4#get-current-account} for
   * the API route specification.
   *
   * @returns the user and account information.
   */
  public async getCurrentAccount(): Promise<GetCurrentAccount> {
    return await this.api.get<GetCurrentAccount>("/account");
  }

  /**
   * Returns list of colors for the current account.
   *
   * @returns a list of colors as hex strings in an array.
   *
   * @see {@link https://developers.kit.com/v4#list-colors}
   */
  public async listColors(): Promise<ListColors> {
    return await this.api.get<ListColors>("/account/colors");
  }

  /**
   * Update and return the newly set colors.
   *
   * @param params - the required parameters to update the colors.
   *
   * @see {@link https://developers.kit.com/v4#update-colors}
   *
   * @returns the newly set list of hex colors in an array.
   */
  public async updateColors(params: UpdateColorsParams): Promise<UpdateColors> {
    const { colors = [] } = params || {};

    if (colors.length === 0) {
      throw new Error(
        "Cannot update colors to an empty list. Please enter up to 5 different hex colors"
      );
    } else if (colors.length > 5) {
      throw new Error(
        "Cannot update colors with more than 5 colors specified. Please specify between 1 and 5 different colors to update to"
      );
    }

    const body = JSON.stringify({ colors });

    return await this.api.put<UpdateColors>("/account/colors", { body });
  }

  /**
   * Returns the Creator Profile details.
   *
   * @see {@link https://developers.kit.com/v4#get-creator-profile}
   *
   * @returns the details stored on the current profile or `null` if
   * the creator profile does not exist.
   */
  public async getCreatorProfile(): Promise<GetCreatorProfile | null> {
    const url = "/account/creator_profile";

    return await this.api.get<GetCreatorProfile | null>(url);
  }

  /**
   * Returns your email stats for the last 90 days.
   *
   * @see {@link https://developers.kit.com/v4#get-email-stats}
   *
   * @returns the basic email statistics over the last 90 days.
   */
  public async getEmailStats(): Promise<GetEmailStats> {
    return await this.api.get<GetEmailStats>("/account/email_stats");
  }

  /**
   * Returns your growth stats for the provided starting and ending dates.
   *
   * @remarks This endpoint defaults to the last 90 days. It also
   * returns your stats in your sending timezone. It does not
   * return any timestamps in UTC.
   *
   * @param params - The optional `starting` and `ending` dates to
   * search between. If these are not provided, the endpoint
   * defaults to the last 90 days.
   *
   * @see {@link https://developers.kit.com/v4#get-growth-stats}
   *
   * @returns the growth stats as reported between the start and
   * end dates.
   */
  public async getGrowthStats(
    params?: GetGrowthStatsParams
  ): Promise<GetGrowthStats> {
    const { starting, ending } = params || {};

    const query = new URLSearchParams({
      ...(starting && { starting: toDateString(starting) }),
      ...(ending && { ending: toDateString(ending) }),
    });

    const url = "/account/growth_stats";

    return await this.api.get<GetGrowthStats>(url, { query });
  }
}

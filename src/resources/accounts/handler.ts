import type { Kit, RequestOptions } from "~/index";
import { toDateOnlyString } from "~/utils/date";
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
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/accounts/get-current-account}
   * for the API route specification.
   *
   * @returns the user and account information.
   */
  public async getCurrentAccount(
    options?: RequestOptions
  ): Promise<GetCurrentAccount> {
    return await this.api.get<GetCurrentAccount>("/account", {
      signal: options?.signal,
    });
  }

  /**
   * Returns list of colors for the current account.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/accounts/list-colors}
   * for the API route specification.
   *
   * @returns a list of colors as hex strings in an array.
   */
  public async listColors(options?: RequestOptions): Promise<ListColors> {
    return await this.api.get<ListColors>("/account/colors", {
      signal: options?.signal,
    });
  }

  /**
   * Replace the entire account palette with up to 10 hex colors and
   * return the newly set colors. Include every color you want to keep.
   *
   * @param params - the required parameters to update the colors.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/accounts/update-colors}
   *
   * @returns the newly set list of hex colors in an array.
   */
  public async updateColors(
    params: UpdateColorsParams,
    options?: RequestOptions
  ): Promise<UpdateColors> {
    const { colors = [] } = params || {};

    if (colors.length === 0) {
      throw new Error(
        "Cannot update colors to an empty list. Please enter up to 10 different hex colors"
      );
    } else if (colors.length > 10) {
      throw new Error(
        "Cannot update colors with more than 10 colors specified. Please specify between 1 and 10 different colors to update to"
      );
    }

    const body = JSON.stringify({ colors });

    return await this.api.put<UpdateColors>("/account/colors", {
      body,
      signal: options?.signal,
    });
  }

  /**
   * Returns the Creator Profile details.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/accounts/get-creator-profile}
   *
   * @returns the details stored on the current profile or `null` if
   * the creator profile does not exist.
   */
  public async getCreatorProfile(
    options?: RequestOptions
  ): Promise<GetCreatorProfile | null> {
    const url = "/account/creator_profile";

    return await this.api.get<GetCreatorProfile | null>(url, {
      signal: options?.signal,
    });
  }

  /**
   * Returns your email stats for the last 90 days.
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/accounts/get-email-stats}
   *
   * @returns the basic email statistics over the last 90 days.
   */
  public async getEmailStats(options?: RequestOptions): Promise<GetEmailStats> {
    return await this.api.get<GetEmailStats>("/account/email_stats", {
      signal: options?.signal,
    });
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
   * @param options - Optional request controls, including cancellation.
   *
   * @see {@link https://developers.kit.com/api-reference/accounts/get-growth-stats}
   *
   * @returns the growth stats as reported between the start and
   * end dates.
   */
  public async getGrowthStats(
    params?: GetGrowthStatsParams,
    options?: RequestOptions
  ): Promise<GetGrowthStats> {
    const { starting, ending } = params || {};

    const query = new URLSearchParams({
      ...(starting && { starting: toDateOnlyString(starting) }),
      ...(ending && { ending: toDateOnlyString(ending) }),
    });

    const url = "/account/growth_stats";

    return await this.api.get<GetGrowthStats>(url, {
      query,
      signal: options?.signal,
    });
  }
}

/** User metadata returned by the current account endpoint. */
export interface AccountUser {
  email: string;
  id?: number | undefined;
}

/** Sending address metadata returned by current account reads. */
export interface AccountSendingAddress {
  email_address: string;
  from_name: string;
  status: string;
  is_default: boolean;
  is_verified: boolean;
  is_dmarc_configured: boolean;
}

/** Account plan metadata; scheduled plan dates may be unavailable. */
export interface AccountPlan {
  plan_type: string;
  interval: string;
  subscriber_limit: number;
  on_trial: boolean;
  trial_lapse_date: string | null;
  renews_at: string | null;
  cancels_at: string | null;
}

/** Timezone metadata returned by current account reads. */
export interface AccountTimezone {
  name: string;
  friendly_name: string;
  utc_offset: string;
}

/** Current account details, including optional sending addresses and plan metadata. */
export interface Account {
  id: number;
  name: string;
  plan_type: string;
  primary_email_address: string;
  created_at: string;
  sending_addresses?: AccountSendingAddress[] | undefined;
  plan?: AccountPlan | undefined;
  timezone: AccountTimezone;
}

export interface GetCurrentAccount {
  user: AccountUser;
  account: Account;
}

export interface ListColors {
  /**
   * An array of up to 10 color hex codes.
   */
  colors: string[];
}

export interface UpdateColorsParams {
  /**
   * An array of up to 10 color hex codes. Replaces the entire palette;
   * include every color you want to keep.
   */
  colors: string[];
}

export interface UpdateColors {
  colors: string[];
}

/** Public creator profile metadata returned by account reads. */
export interface CreatorProfile {
  name: string;
  byline: string;
  bio: string;
  image_url: string;
  profile_url: string;
}

export interface GetCreatorProfile {
  profile: CreatorProfile;
}

/** Account-wide email engagement and tracking statistics. */
export interface AccountEmailStats {
  sent: number;
  clicked: number;
  opened: number;
  open_rate: number;
  click_rate: number;
  unsubscribe_rate: number;
  bounce_rate: number;
  email_stats_mode: "last_90" | (string & {});
  open_tracking_enabled: boolean;
  click_tracking_enabled: boolean;
  starting: string;
  ending: string;
}

export interface GetEmailStats {
  stats: AccountEmailStats;
}

export interface GetGrowthStatsParams {
  /**
   * Get stats for time period ending on this date (format yyyy-mm-dd).
   * Defaults to today. Date objects use their UTC calendar date;
   * strings should already be formatted as "yyyy-mm-dd".
   */
  ending?: Date | string | undefined;

  /**
   * Get stats for time period beginning on this date (format
   * yyyy-mm-dd). Defaults to 90 days ago. Date objects use their
   * UTC calendar date; strings should already be formatted as
   * "yyyy-mm-dd".
   */
  starting?: Date | string | undefined;
}

/** Account subscriber growth statistics for the requested date range. */
export interface AccountGrowthStats {
  cancellations: number;
  net_new_subscribers: number;
  new_subscribers: number;
  subscribers: number;
  starting: string;
  ending: string;
}

export interface GetGrowthStats {
  stats: AccountGrowthStats;
}

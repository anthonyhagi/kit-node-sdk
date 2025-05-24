export interface GetCurrentAccount {
  user: {
    email: string;
    account: {
      name: string;
      plan_type: string;
      primary_email_address: string;
      created_at?: string | undefined;
      id?: string | undefined;
      timezone?:
        | {
            name: string;
            friendly_name: string;
            utc_offset: string;
          }
        | undefined;
    };
  };
}

export interface ListColors {
  colors: string[];
}

export interface GetCreatorProfile {
  profile: {
    name: string;
    byline: string;
    bio: string;
    image_url: string;
    profile_url: string;
  };
}

export interface GetEmailStats {
  stats: {
    sent: number;
    clicked: number;
    opened: number;
    email_stats_mode: "last_90" | (string & {});
    open_tracking_enabled: boolean;
    click_tracking_enabled: boolean;
    starting: string;
    ending: string;
  };
}

export interface GetGrowthStatsParams {
  ending?: Date | string | undefined;
  starting?: Date | string | undefined;
}

export interface GetGrowthStats {
  stats: {
    cancellations: number;
    net_new_subscribers: number;
    new_subscribers: number;
    subscribers: number;
    starting: string;
    ending: string;
  };
}

export interface GetBroadcast {
  broadcast: {
    id: number;
    created_at: string;
    subject: string;
    description: unknown;
    content: unknown;
    public: boolean;
    published_at: unknown;
    send_at: unknown;
    thumbnail_alt: unknown;
    thumbnail_url: unknown;
    email_address: string | null;
    preview_text?: unknown | undefined;
    email_template: {
      id: number;
      name: string;
    };
    subscriber_filter: {
      all?: { type: string; ids?: number[] | undefined }[] | undefined;
      any?: { type: string; ids: number[] }[] | undefined;
      none?: { type: string; ids: number[] }[] | undefined;
    }[];
    publication_id?: number | undefined;
    clicks?:
      | {
          url: string;
          unique_clicks: number;
          click_to_delivery_rate: number;
          click_to_open_rate: number;
        }[]
      | undefined;
    stats?:
      | {
          recipients: number[];
          open_rate: number;
          emails_opened: number;
          click_rate: number;
          unsubscribe_rate: number;
          unsubscribes: number;
          total_clicks: number;
          show_total_clicks: boolean;
          status: string;
          progress: number;
          open_tracking_disabled: boolean;
          click_tracking_disabled: boolean;
        }
      | undefined;
  };
}

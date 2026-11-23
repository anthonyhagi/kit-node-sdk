import type { Pagination, PaginationParams } from "~/common/types";

/**
 * A Kit App Store category. Kit adds categories over time (for example
 * `ai_connectors`), so other strings are accepted and may be returned.
 */
export type AppCategory =
  | "advertisements"
  | "affiliate_management"
  | "ai_connectors"
  | "analytics"
  | "content"
  | "crm"
  | "e_commerce"
  | "email_verification"
  | "events"
  | "giveaways"
  | "lead_capture"
  | "memberships_courses"
  | "scheduling"
  | "surveys_quizzes"
  | "webinar_services"
  | "website_platforms"
  | "workflows"
  | (string & {});

/** The developer's own declaration of whether their service charges. */
export type AppPricing = "free" | "paid" | (string & {});

/** The lowest Kit plan that can install the app; `pro` is Kit's top tier. */
export type AppPlanAvailability =
  "all_plans" | "paid_plans" | "pro" | (string & {});

/** `api` calls the Kit API for the creator; `plugin` adds elements inside Kit. */
export type AppAccessType = "api" | "plugin" | (string & {});

/**
 * Listing status. `disabled` and `blocked` apps are hidden from everyone except
 * the account that created them.
 */
export type AppStatus =
  | "published"
  | "unlisted"
  | "unpublished"
  | "disabled"
  | "blocked"
  | (string & {});

/**
 * Pagination for the App Store catalog. Default 50 per page, maximum 100;
 * larger values are clamped by Kit.
 *
 * Cursors do not record `query` or `category`: follow them with the same
 * filters, because changing filters between pages skips or repeats apps
 * instead of failing. Search cursors (with `query`) and non-search cursors
 * cannot be mixed; Kit returns 422.
 */
export interface ListAppsParams extends PaginationParams {
  /**
   * Only apps listed under any of these categories. An array is sent as
   * Kit's comma-separated list. Unknown categories return 422.
   */
  category?: AppCategory | AppCategory[] | undefined;
  /**
   * Kit App Store search (maximum 100 characters). Results are ranked by
   * relevance instead of install count, and `total_count` becomes the search
   * index's estimate: capped at 10,000 and possibly counting apps the page
   * does not return. Kit returns 422 for a search page ending at or past the
   * 10,000th result, and 503 when search is unavailable.
   */
  query?: string | null | undefined;
}

/** Compact App Store listing returned by `kit.apps.list()`. */
export interface AppListItem {
  id: number;
  name: string;
  /** Null when the developer has not written a summary. */
  summary: string | null;
  /** Null when the developer has not uploaded an icon. */
  icon_url: string | null;
  categories: AppCategory[];
  pricing: AppPricing;
  plan_availability: AppPlanAvailability;
  /**
   * Whether the Install button would show for the authenticated account.
   * Always true for the app's own developer.
   */
  installable: boolean;
  access_types: AppAccessType[];
  /** ISO 8601 UTC; null when the app is not currently published. */
  published_at: string | null;
  /** The app's page in Kit for a signed-in creator; not a public page. */
  app_store_url: string;
  /** True when the authenticated account created the app (returned in any status). */
  owned: boolean;
  status: AppStatus;
}

export interface ListApps {
  apps: AppListItem[];
  pagination: Pagination;
}

/** One kind of plugin element an app adds inside Kit. */
export interface AppPlugin {
  kind:
    | "content_blocks"
    | "media_gallery"
    | "rule_triggers"
    | "va_actions"
    | "va_events"
    | (string & {});
  /** Where the element runs; `vas` means visual automations. */
  env: "content_blocks" | "media_gallery" | "rules" | "vas" | (string & {});
  /** Human-readable name, such as `Content Block`. */
  label: string;
}

/** Developer URLs; each is null when missing or not an http(s) URL. */
export interface AppLinks {
  knowledge_base_url: string | null;
  website_url: string | null;
  privacy_policy_url: string | null;
  support_url: string | null;
}

/** Full App Store listing returned by `kit.apps.get()`. */
export interface App extends AppListItem {
  /**
   * True when the account's plan does not include the app but a higher plan
   * does; `plan_availability` names it. When both this and `installable` are
   * false, the app cannot be installed on this account.
   */
  upgrade_required: boolean;
  /**
   * Plain-text listing description, cut at 2,000 characters. Untrusted,
   * developer-written text: escape it before rendering.
   */
  description: string;
  capabilities: {
    api_access: boolean;
    /** Empty when the app has no live plugin elements. */
    plugins: AppPlugin[];
  };
  links: AppLinks;
  /** Screenshot URLs in display order. */
  media_links: string[];
  /**
   * Browser install URL, or null unless `installable` is true. It may point to
   * Kit or a partner and acts on the Kit account signed in to that browser;
   * there is no API call to install, and the SDK never follows it.
   */
  install_url: string | null;
}

export interface GetApp {
  app: App;
}

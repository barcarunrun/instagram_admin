import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  CalendarEvent,
  ContentItem,
  CurrentUser,
  DashboardAlert,
  DashboardKpi,
  DashboardSummary,
  InstagramIntegration,
  JobLog,
  MediaAsset,
} from "./types";

const SERVER_API_BASE =
  process.env.SERVER_API_BASE_URL ?? "http://localhost:4000/api";

async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  const response = await fetch(`${SERVER_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new Error(body?.error?.message ?? "API request failed");
  }

  return response.json() as Promise<T>;
}

function createDashboardQuery(range?: { from?: string; to?: string }): string {
  const params = new URLSearchParams();

  if (range?.from) {
    params.set("from", range.from);
  }

  if (range?.to) {
    params.set("to", range.to);
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

export const serverApi = {
  getCurrentUser(): Promise<{ user: CurrentUser }> {
    return serverFetch<{ user: CurrentUser }>("/auth/me");
  },

  getIntegrationStatus(): Promise<InstagramIntegration> {
    return serverFetch<InstagramIntegration>("/integrations/instagram/status");
  },

  getContents(): Promise<{ items: ContentItem[] }> {
    return serverFetch<{ items: ContentItem[] }>("/contents");
  },

  getMediaAssets(options?: {
    excludeDemo?: boolean;
    keyword?: string;
    mediaType?: MediaAsset["mediaType"] | "all";
    usedOnly?: boolean;
  }): Promise<{ items: MediaAsset[] }> {
    const params = new URLSearchParams();

    if (options?.excludeDemo) {
      params.set("excludeDemo", "true");
    }

    if (options?.keyword) {
      params.set("keyword", options.keyword);
    }

    if (options?.mediaType && options.mediaType !== "all") {
      params.set("mediaType", options.mediaType);
    }

    if (options?.usedOnly) {
      params.set("usedOnly", "true");
    }

    const query = params.toString();
    return serverFetch<{ items: MediaAsset[] }>(
      query.length > 0 ? `/media-assets?${query}` : "/media-assets",
    );
  },

  getDashboardKpi(range?: {
    from?: string;
    to?: string;
  }): Promise<DashboardKpi> {
    return serverFetch<DashboardKpi>(
      `/dashboard/kpi${createDashboardQuery(range)}`,
    );
  },

  getDashboardAlerts(range?: {
    from?: string;
    to?: string;
  }): Promise<{ items: DashboardAlert[] }> {
    return serverFetch<{ items: DashboardAlert[] }>(
      `/dashboard/alerts${createDashboardQuery(range)}`,
    );
  },

  getDashboardSummary(range?: {
    from?: string;
    to?: string;
  }): Promise<DashboardSummary> {
    return serverFetch<DashboardSummary>(
      `/dashboard/summary${createDashboardQuery(range)}`,
    );
  },

  getCalendarEvents(range?: {
    from?: string;
    to?: string;
  }): Promise<{ items: CalendarEvent[] }> {
    return serverFetch<{ items: CalendarEvent[] }>(
      `/calendar/events${createDashboardQuery(range)}`,
    );
  },

  getJobLogs(): Promise<{ items: JobLog[] }> {
    return serverFetch<{ items: JobLog[] }>("/jobs/logs");
  },
};

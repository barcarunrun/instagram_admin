import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  CalendarEvent,
  ContentItem,
  CurrentUser,
  DashboardAlert,
  DashboardKpi,
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

  getMediaAssets(): Promise<{ items: MediaAsset[] }> {
    return serverFetch<{ items: MediaAsset[] }>("/media-assets");
  },

  getDashboardKpi(): Promise<DashboardKpi> {
    return serverFetch<DashboardKpi>("/dashboard/kpi");
  },

  getDashboardAlerts(): Promise<{ items: DashboardAlert[] }> {
    return serverFetch<{ items: DashboardAlert[] }>("/dashboard/alerts");
  },

  getCalendarEvents(): Promise<{ items: CalendarEvent[] }> {
    return serverFetch<{ items: CalendarEvent[] }>("/calendar/events");
  },

  getJobLogs(): Promise<{ items: JobLog[] }> {
    return serverFetch<{ items: JobLog[] }>("/jobs/logs");
  },
};

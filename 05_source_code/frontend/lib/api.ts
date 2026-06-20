import type {
  CalendarEvent,
  ContentItem,
  CurrentUser,
  DashboardAlert,
  DashboardKpi,
  InstagramIntegration,
  JobLog,
  MediaAsset,
  ScheduleValidationResult,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

const SERVER_API_BASE = process.env.SERVER_API_BASE_URL ?? API_BASE;

function getApiBase(): string {
  return typeof window === "undefined" ? SERVER_API_BASE : API_BASE;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new Error(body?.error?.message ?? "API request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(payload: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; expiresIn: number; user: CurrentUser }> {
    return apiFetch<{ accessToken: string; expiresIn: number; user: CurrentUser }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  logout(): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" });
  },

  getCurrentUser(): Promise<{ user: CurrentUser }> {
    return apiFetch<{ user: CurrentUser }>("/auth/me");
  },

  getIntegrationStatus(): Promise<InstagramIntegration> {
    return apiFetch<InstagramIntegration>("/integrations/instagram/status");
  },

  getContents(): Promise<{ items: ContentItem[] }> {
    return apiFetch<{ items: ContentItem[] }>("/contents");
  },

  createContent(payload: Partial<ContentItem>): Promise<ContentItem> {
    return apiFetch<ContentItem>("/contents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateContent(
    id: string,
    payload: Partial<ContentItem>,
  ): Promise<ContentItem> {
    return apiFetch<ContentItem>(`/contents/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  duplicateContent(id: string): Promise<ContentItem> {
    return apiFetch<ContentItem>(`/contents/${id}/duplicate`, {
      method: "POST",
    });
  },

  validateContent(id: string): Promise<ContentItem["validation"]> {
    return apiFetch<ContentItem["validation"]>(`/contents/${id}/validate`, {
      method: "POST",
    });
  },

  getMediaAssets(): Promise<{ items: MediaAsset[] }> {
    return apiFetch<{ items: MediaAsset[] }>("/media-assets");
  },

  validateSchedule(payload: {
    contentId: string;
    publishAt: string;
    timezone: string;
    accountId: string;
  }): Promise<ScheduleValidationResult> {
    return apiFetch<ScheduleValidationResult>("/schedules/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createSchedule(payload: {
    contentId: string;
    publishAt: string;
    timezone: string;
    accountId: string;
  }) {
    return apiFetch("/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getDashboardKpi(): Promise<DashboardKpi> {
    return apiFetch<DashboardKpi>("/dashboard/kpi");
  },

  getDashboardAlerts(): Promise<{ items: DashboardAlert[] }> {
    return apiFetch<{ items: DashboardAlert[] }>("/dashboard/alerts");
  },

  getCalendarEvents(): Promise<{ items: CalendarEvent[] }> {
    return apiFetch<{ items: CalendarEvent[] }>("/calendar/events");
  },

  getJobLogs(): Promise<{ items: JobLog[] }> {
    return apiFetch<{ items: JobLog[] }>("/jobs/logs");
  },

  retryJob(jobId: string): Promise<JobLog> {
    return apiFetch<JobLog>(`/jobs/${jobId}/retry`, { method: "POST" });
  },
};

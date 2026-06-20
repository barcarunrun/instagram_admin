import type {
  CalendarEvent,
  ContentItem,
  CurrentUser,
  DashboardAlert,
  DashboardKpi,
  DashboardSummary,
  InstagramIntegration,
  InstagramOAuthSession,
  JobLog,
  MediaAsset,
  ScheduleItem,
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

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    body: formData,
    credentials: "include",
    cache: "no-store",
  });

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

export const api = {
  login(payload: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; expiresIn: number; user: CurrentUser }> {
    return apiFetch<{
      accessToken: string;
      expiresIn: number;
      user: CurrentUser;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
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

  startInstagramOAuth(params: {
    intent: "connect" | "reauthorize";
    scenario?: string;
  }): Promise<{
    authorizeUrl: string;
    callbackUrl: string;
    state: string;
    oauthSessionId: string;
  }> {
    const searchParams = new URLSearchParams({ intent: params.intent });
    if (params.scenario) {
      searchParams.set("scenario", params.scenario);
    }

    return apiFetch<{
      authorizeUrl: string;
      callbackUrl: string;
      state: string;
      oauthSessionId: string;
    }>(`/auth/instagram/oauth-url?${searchParams.toString()}`);
  },

  getInstagramOAuthSession(sessionId: string): Promise<InstagramOAuthSession> {
    return apiFetch<InstagramOAuthSession>(
      `/integrations/instagram/oauth-sessions/${sessionId}`,
    );
  },

  bootstrapInstagramWithExistingToken(): Promise<InstagramOAuthSession> {
    return apiFetch<InstagramOAuthSession>(
      "/integrations/instagram/bootstrap-existing-token",
      {
        method: "POST",
      },
    );
  },

  connectInstagram(payload: {
    oauthSessionId: string;
    accountId: string;
  }): Promise<InstagramIntegration> {
    return apiFetch<InstagramIntegration>("/integrations/instagram/connect", {
      method: "POST",
      body: JSON.stringify(payload),
    });
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

  previewContentValidation(
    id: string,
    payload: Partial<ContentItem>,
  ): Promise<ContentItem["validation"]> {
    return apiFetch<ContentItem["validation"]>(`/contents/${id}/validate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getMediaAssets(): Promise<{ items: MediaAsset[] }> {
    return apiFetch<{ items: MediaAsset[] }>("/media-assets");
  },

  uploadMedia(file: File): Promise<MediaAsset> {
    const formData = new FormData();
    formData.append("file", file);
    return uploadFile<MediaAsset>("/media-assets", formData);
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
  }): Promise<ScheduleItem> {
    return apiFetch<ScheduleItem>("/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getScheduleForContent(contentId: string): Promise<ScheduleItem> {
    return apiFetch<ScheduleItem>(`/schedules/content/${contentId}`);
  },

  getSchedule(id: string): Promise<ScheduleItem> {
    return apiFetch<ScheduleItem>(`/schedules/${id}`);
  },

  updateSchedule(
    id: string,
    payload: {
      contentId: string;
      publishAt: string;
      timezone: string;
      accountId: string;
    },
  ): Promise<ScheduleItem> {
    return apiFetch<ScheduleItem>(`/schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  cancelSchedule(id: string): Promise<ScheduleItem> {
    return apiFetch<ScheduleItem>(`/schedules/${id}`, {
      method: "DELETE",
    });
  },

  getDashboardKpi(range?: {
    from?: string;
    to?: string;
  }): Promise<DashboardKpi> {
    return apiFetch<DashboardKpi>(
      `/dashboard/kpi${createDashboardQuery(range)}`,
    );
  },

  getDashboardAlerts(range?: {
    from?: string;
    to?: string;
  }): Promise<{ items: DashboardAlert[] }> {
    return apiFetch<{ items: DashboardAlert[] }>(
      `/dashboard/alerts${createDashboardQuery(range)}`,
    );
  },

  getDashboardSummary(range?: {
    from?: string;
    to?: string;
  }): Promise<DashboardSummary> {
    return apiFetch<DashboardSummary>(
      `/dashboard/summary${createDashboardQuery(range)}`,
    );
  },

  getCalendarEvents(range?: {
    from?: string;
    to?: string;
  }): Promise<{ items: CalendarEvent[] }> {
    return apiFetch<{ items: CalendarEvent[] }>(
      `/calendar/events${createDashboardQuery(range)}`,
    );
  },

  getJobLogs(): Promise<{ items: JobLog[] }> {
    return apiFetch<{ items: JobLog[] }>("/jobs/logs");
  },

  retryJob(jobId: string): Promise<JobLog> {
    return apiFetch<JobLog>(`/jobs/${jobId}/retry`, { method: "POST" });
  },
};

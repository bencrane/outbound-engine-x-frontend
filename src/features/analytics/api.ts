import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";

type CampaignAnalyticsFilters = NonNullable<
  paths["/api/analytics/campaigns"]["get"]["parameters"]["query"]
>;

type ClientAnalyticsFilters = NonNullable<
  paths["/api/analytics/clients"]["get"]["parameters"]["query"]
>;

type ReliabilityAnalyticsFilters = NonNullable<
  paths["/api/analytics/reliability"]["get"]["parameters"]["query"]
>;

type MessageSyncHealthFilters = NonNullable<
  paths["/api/analytics/message-sync-health"]["get"]["parameters"]["query"]
>;

type WorkspaceStatsBody =
  paths["/api/email-outreach/workspace/stats"]["post"]["requestBody"]["content"]["application/json"];

type WorkspaceCampaignEventsBody =
  paths["/api/email-outreach/workspace/campaign-events/stats"]["post"]["requestBody"]["content"]["application/json"];

export function useCampaignAnalytics(options?: CampaignAnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "campaigns", options ?? {}],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/analytics/campaigns", {
        params: {
          query: options,
        },
      });

      if (error) {
        throw new Error("Failed to fetch campaign analytics.");
      }

      return data ?? [];
    },
  });
}

export function useClientAnalytics(options?: ClientAnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "clients", options ?? {}],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/analytics/clients", {
        params: {
          query: options,
        },
      });

      if (error) {
        throw new Error("Failed to fetch client analytics.");
      }

      return data ?? [];
    },
  });
}

export function useReliabilityAnalytics(options?: ReliabilityAnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "reliability", options ?? {}],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/analytics/reliability", {
        params: {
          query: options,
        },
      });

      if (error || !data) {
        throw new Error("Failed to fetch reliability analytics.");
      }

      return data;
    },
  });
}

export function useMessageSyncHealth(options?: MessageSyncHealthFilters) {
  return useQuery({
    queryKey: ["analytics", "message-sync-health", options ?? {}],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/analytics/message-sync-health", {
        params: {
          query: options,
        },
      });

      if (error) {
        throw new Error("Failed to fetch message sync health.");
      }

      return data ?? [];
    },
  });
}

export function useWorkspaceStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["analytics", "workspace-stats", startDate ?? "", endDate ?? ""],
    enabled: Boolean(startDate && endDate),
    queryFn: async () => {
      const body: WorkspaceStatsBody = {
        start_date: startDate!,
        end_date: endDate!,
      };
      const { data, error } = await apiClient.POST("/api/email-outreach/workspace/stats", {
        body,
      });

      if (error) {
        throw new Error("Failed to fetch workspace stats.");
      }

      return (data as Record<string, unknown>) ?? {};
    },
  });
}

export function useWorkspaceCampaignEventsStats(
  startDate?: string,
  endDate?: string,
  options?: Omit<WorkspaceCampaignEventsBody, "start_date" | "end_date">
) {
  return useQuery({
    queryKey: [
      "analytics",
      "workspace-campaign-events",
      startDate ?? "",
      endDate ?? "",
      options ?? {},
    ],
    enabled: Boolean(startDate && endDate),
    queryFn: async () => {
      const body: WorkspaceCampaignEventsBody = {
        start_date: startDate!,
        end_date: endDate!,
        campaign_ids: options?.campaign_ids,
        inbox_ids: options?.inbox_ids,
      };
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/workspace/campaign-events/stats",
        { body }
      );

      if (error) {
        throw new Error("Failed to fetch workspace campaign events stats.");
      }

      return (data as Record<string, unknown>) ?? {};
    },
  });
}

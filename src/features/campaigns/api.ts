import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";

type CampaignsFilters = NonNullable<
  paths["/api/campaigns/"]["get"]["parameters"]["query"]
>;

type LinkedinCampaignsFilters = NonNullable<
  paths["/api/linkedin/campaigns/"]["get"]["parameters"]["query"]
>;

type RecentMessagesFilters = NonNullable<
  paths["/api/campaigns/messages"]["get"]["parameters"]["query"]
>;

type SequenceStepPerformanceFilters = NonNullable<
  paths["/api/analytics/campaigns/{campaign_id}/sequence-steps"]["get"]["parameters"]["query"]
>;

type CampaignStatusUpdateRequest =
  paths["/api/campaigns/{campaign_id}/status"]["post"]["requestBody"]["content"]["application/json"];
type CreateCampaignBody =
  paths["/api/campaigns/"]["post"]["requestBody"]["content"]["application/json"];
type CreateLinkedinCampaignBody =
  paths["/api/linkedin/campaigns/"]["post"]["requestBody"]["content"]["application/json"];
type LinkedinCampaignActionBody =
  paths["/api/linkedin/campaigns/{campaign_id}/action"]["post"]["requestBody"]["content"]["application/json"];
type LinkedinLeadStatusUpdateBody =
  paths["/api/linkedin/campaigns/{campaign_id}/leads/{lead_id}/status"]["post"]["requestBody"]["content"]["application/json"];
type LinkedinSendMessageBody =
  paths["/api/linkedin/campaigns/{campaign_id}/leads/{lead_id}/messages"]["post"]["requestBody"]["content"]["application/json"];
type BulkDeleteCampaignsBody =
  paths["/api/email-outreach/campaigns/bulk"]["delete"]["requestBody"]["content"]["application/json"];
type BulkCreateLeadsCsvBody =
  paths["/api/email-outreach/leads/bulk/csv"]["post"]["requestBody"]["content"]["application/json"];
type BulkUpdateLeadStatusBody =
  paths["/api/email-outreach/leads/bulk/status"]["patch"]["requestBody"]["content"]["application/json"];
type BulkDeleteLeadsBody =
  paths["/api/email-outreach/leads/bulk"]["delete"]["requestBody"]["content"]["application/json"];

export const campaignQueryKeys = {
  list: (options?: CampaignsFilters) => ["campaigns", "list", options ?? {}] as const,
  linkedinList: (options?: LinkedinCampaignsFilters) =>
    ["linkedin", "campaigns", options ?? {}] as const,
  detail: (campaignId: string) => ["campaigns", campaignId] as const,
  linkedinDetail: (campaignId: string) => ["linkedin", "campaigns", campaignId] as const,
  summary: (campaignId: string) => ["campaigns", campaignId, "summary"] as const,
  leads: (campaignId: string) => ["campaigns", campaignId, "leads"] as const,
  linkedinLeads: (campaignId: string) => ["linkedin", campaignId, "leads"] as const,
  sequence: (campaignId: string) => ["campaigns", campaignId, "sequence"] as const,
  schedule: (campaignId: string) => ["campaigns", campaignId, "schedule"] as const,
  replies: (campaignId: string) => ["campaigns", campaignId, "replies"] as const,
  providerAnalytics: (campaignId: string) =>
    ["campaigns", campaignId, "provider-analytics"] as const,
  linkedinMetrics: (campaignId: string) => ["linkedin", campaignId, "metrics"] as const,
  sequenceSteps: (
    campaignId: string,
    options?: SequenceStepPerformanceFilters
  ) => ["campaigns", campaignId, "sequence-steps", options ?? {}] as const,
  messagesRecent: (options?: RecentMessagesFilters) =>
    ["campaigns", "messages", "recent", options ?? {}] as const,
};

export function useCampaigns(options?: CampaignsFilters) {
  return useQuery({
    queryKey: campaignQueryKeys.list(options),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/campaigns/", {
        params: {
          query: options,
        },
      });

      if (error) {
        throw new Error("Failed to fetch campaigns.");
      }

      return data ?? [];
    },
  });
}

export function useLinkedinCampaigns(options?: LinkedinCampaignsFilters) {
  return useQuery({
    queryKey: campaignQueryKeys.linkedinList(options),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/linkedin/campaigns/", {
        params: {
          query: options,
        },
      });

      if (error) {
        throw new Error("Failed to fetch LinkedIn campaigns.");
      }

      return data ?? [];
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCampaignBody) => {
      const { data, error } = await apiClient.POST("/api/campaigns/", { body });
      if (error || !data) {
        throw new Error("Failed to create campaign.");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: campaignQueryKeys.list() });
    },
  });
}

export function useCreateLinkedinCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateLinkedinCampaignBody) => {
      const { data, error } = await apiClient.POST("/api/linkedin/campaigns/", { body });
      if (error || !data) {
        throw new Error("Failed to create LinkedIn campaign.");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["linkedin", "campaigns"] });
    },
  });
}

export function useRecentMessages(options?: RecentMessagesFilters) {
  return useQuery({
    queryKey: campaignQueryKeys.messagesRecent(options),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/campaigns/messages", {
        params: {
          query: {
            ...options,
            limit: 20,
          },
        },
      });

      if (error) {
        throw new Error("Failed to fetch recent messages.");
      }

      return data ?? [];
    },
  });
}

export function useCampaign(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: campaignQueryKeys.detail(campaignId),
    enabled: Boolean(campaignId) && enabled,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/campaigns/{campaign_id}", {
        params: {
          path: { campaign_id: campaignId },
        },
      });

      if (error || !data) {
        throw new Error("Failed to fetch campaign.");
      }

      return data;
    },
  });
}

export function useLinkedinCampaign(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: campaignQueryKeys.linkedinDetail(campaignId),
    enabled: Boolean(campaignId) && enabled,
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/linkedin/campaigns/{campaign_id}",
        {
          params: {
            path: {
              campaign_id: campaignId,
            },
          },
        }
      );

      if (error || !data) {
        throw new Error("Failed to fetch LinkedIn campaign.");
      }

      return data;
    },
  });
}

export function useCampaignAnalyticsSummary(campaignId: string) {
  return useQuery({
    queryKey: campaignQueryKeys.summary(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/campaigns/{campaign_id}/analytics/summary",
        {
          params: {
            path: { campaign_id: campaignId },
          },
        }
      );

      if (error || !data) {
        throw new Error("Failed to fetch campaign analytics summary.");
      }

      return data;
    },
  });
}

export function useCampaignLeads(campaignId: string) {
  return useQuery({
    queryKey: campaignQueryKeys.leads(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/campaigns/{campaign_id}/leads", {
        params: {
          path: { campaign_id: campaignId },
        },
      });

      if (error) {
        throw new Error("Failed to fetch campaign leads.");
      }

      return data ?? [];
    },
  });
}

export function useLinkedinCampaignLeads(campaignId: string) {
  return useQuery({
    queryKey: campaignQueryKeys.linkedinLeads(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/linkedin/campaigns/{campaign_id}/leads",
        {
          params: {
            path: {
              campaign_id: campaignId,
            },
          },
        }
      );

      if (error) {
        throw new Error("Failed to fetch LinkedIn campaign leads.");
      }

      return data ?? [];
    },
  });
}

export function useCampaignSequence(campaignId: string) {
  return useQuery({
    queryKey: campaignQueryKeys.sequence(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/campaigns/{campaign_id}/sequence", {
        params: {
          path: { campaign_id: campaignId },
        },
      });

      if (error || !data) {
        throw new Error("Failed to fetch campaign sequence.");
      }

      return data;
    },
  });
}

export function useCampaignSchedule(campaignId: string) {
  return useQuery({
    queryKey: campaignQueryKeys.schedule(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/campaigns/{campaign_id}/schedule", {
        params: {
          path: { campaign_id: campaignId },
        },
      });

      if (error || !data) {
        throw new Error("Failed to fetch campaign schedule.");
      }

      return data;
    },
  });
}

export function useCampaignReplies(campaignId: string) {
  return useQuery({
    queryKey: campaignQueryKeys.replies(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/campaigns/{campaign_id}/replies", {
        params: {
          path: { campaign_id: campaignId },
        },
      });

      if (error) {
        throw new Error("Failed to fetch campaign replies.");
      }

      return data ?? [];
    },
  });
}

export function useCampaignProviderAnalytics(campaignId: string) {
  return useQuery({
    queryKey: campaignQueryKeys.providerAnalytics(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/campaigns/{campaign_id}/analytics/provider",
        {
          params: {
            path: { campaign_id: campaignId },
          },
        }
      );

      if (error || !data) {
        throw new Error("Failed to fetch campaign provider analytics.");
      }

      return data;
    },
  });
}

export function useLinkedinCampaignMetrics(campaignId: string) {
  return useQuery({
    queryKey: campaignQueryKeys.linkedinMetrics(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/linkedin/campaigns/{campaign_id}/metrics",
        {
          params: {
            path: {
              campaign_id: campaignId,
            },
          },
        }
      );

      if (error || !data) {
        throw new Error("Failed to fetch LinkedIn campaign metrics.");
      }

      return data;
    },
  });
}

export function useSequenceStepPerformance(
  campaignId: string,
  options?: SequenceStepPerformanceFilters
) {
  return useQuery({
    queryKey: campaignQueryKeys.sequenceSteps(campaignId, options),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/analytics/campaigns/{campaign_id}/sequence-steps",
        {
          params: {
            path: { campaign_id: campaignId },
            query: options,
          },
        }
      );

      if (error) {
        throw new Error("Failed to fetch sequence step performance.");
      }

      return data ?? [];
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      status,
    }: {
      campaignId: string;
      status: CampaignStatusUpdateRequest["status"];
    }) => {
      const { data, error } = await apiClient.POST("/api/campaigns/{campaign_id}/status", {
        params: {
          path: { campaign_id: campaignId },
        },
        body: { status },
      });

      if (error || !data) {
        throw new Error("Failed to update campaign status.");
      }

      return data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: campaignQueryKeys.list() }),
        queryClient.invalidateQueries({
          queryKey: campaignQueryKeys.detail(variables.campaignId),
        }),
        queryClient.invalidateQueries({
          queryKey: campaignQueryKeys.summary(variables.campaignId),
        }),
      ]);
    },
  });
}

export function useLinkedinCampaignAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      action,
    }: {
      campaignId: string;
      action: LinkedinCampaignActionBody["action"];
    }) => {
      const { data, error } = await apiClient.POST(
        "/api/linkedin/campaigns/{campaign_id}/action",
        {
          params: {
            path: {
              campaign_id: campaignId,
            },
          },
          body: { action },
        }
      );

      if (error || !data) {
        throw new Error("Failed to mutate LinkedIn campaign status.");
      }

      return data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: campaignQueryKeys.linkedinList() }),
        queryClient.invalidateQueries({
          queryKey: campaignQueryKeys.linkedinDetail(variables.campaignId),
        }),
      ]);
    },
  });
}

export function usePauseCampaignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      leadId,
    }: {
      campaignId: string;
      leadId: string;
    }) => {
      const { data, error } = await apiClient.POST(
        "/api/campaigns/{campaign_id}/leads/{lead_id}/pause",
        {
          params: {
            path: {
              campaign_id: campaignId,
              lead_id: leadId,
            },
          },
        }
      );

      if (error || !data) {
        throw new Error("Failed to pause lead.");
      }

      return data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: campaignQueryKeys.leads(variables.campaignId),
      });
    },
  });
}

export function useResumeCampaignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      leadId,
    }: {
      campaignId: string;
      leadId: string;
    }) => {
      const { data, error } = await apiClient.POST(
        "/api/campaigns/{campaign_id}/leads/{lead_id}/resume",
        {
          params: {
            path: {
              campaign_id: campaignId,
              lead_id: leadId,
            },
          },
        }
      );

      if (error || !data) {
        throw new Error("Failed to resume lead.");
      }

      return data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: campaignQueryKeys.leads(variables.campaignId),
      });
    },
  });
}

export function useUnsubscribeCampaignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      leadId,
    }: {
      campaignId: string;
      leadId: string;
    }) => {
      const { data, error } = await apiClient.POST(
        "/api/campaigns/{campaign_id}/leads/{lead_id}/unsubscribe",
        {
          params: {
            path: {
              campaign_id: campaignId,
              lead_id: leadId,
            },
          },
        }
      );

      if (error || !data) {
        throw new Error("Failed to unsubscribe lead.");
      }

      return data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: campaignQueryKeys.leads(variables.campaignId),
      });
    },
  });
}

export function useLinkedinLeadStatusUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      leadId,
      status,
    }: {
      campaignId: string;
      leadId: string;
      status: LinkedinLeadStatusUpdateBody["status"];
    }) => {
      const { data, error } = await apiClient.POST(
        "/api/linkedin/campaigns/{campaign_id}/leads/{lead_id}/status",
        {
          params: {
            path: {
              campaign_id: campaignId,
              lead_id: leadId,
            },
          },
          body: { status },
        }
      );

      if (error || !data) {
        throw new Error("Failed to update LinkedIn lead status.");
      }

      return data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: campaignQueryKeys.linkedinLeads(variables.campaignId),
      });
    },
  });
}

export function useSendLinkedinMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      leadId,
      message,
      template_id,
    }: {
      campaignId: string;
      leadId: string;
      message: string;
      template_id?: string;
    }) => {
      const body: LinkedinSendMessageBody = {
        message,
        template_id,
      };
      const { data, error } = await apiClient.POST(
        "/api/linkedin/campaigns/{campaign_id}/leads/{lead_id}/messages",
        {
          params: {
            path: {
              campaign_id: campaignId,
              lead_id: leadId,
            },
          },
          body,
        }
      );

      if (error || !data) {
        throw new Error("Failed to send LinkedIn message.");
      }

      return data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: campaignQueryKeys.linkedinLeads(variables.campaignId),
      });
    },
  });
}

export function useBulkDeleteCampaigns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkDeleteCampaignsBody) => {
      const { data, error } = await apiClient.DELETE("/api/email-outreach/campaigns/bulk", {
        body,
      });
      if (error) {
        throw new Error("Failed to bulk delete campaigns.");
      }
      return data as unknown;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: campaignQueryKeys.list() }),
        queryClient.invalidateQueries({ queryKey: ["linkedin", "campaigns"] }),
      ]);
    },
  });
}

export function useBulkCreateLeadsCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkCreateLeadsCsvBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/leads/bulk/csv", {
        body,
      });
      if (error) {
        throw new Error("Failed to import leads CSV.");
      }
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useBulkUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkUpdateLeadStatusBody) => {
      const { data, error } = await apiClient.PATCH("/api/email-outreach/leads/bulk/status", {
        body,
      });
      if (error) {
        throw new Error("Failed to bulk update lead status.");
      }
      return data as unknown;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: campaignQueryKeys.leads(variables.campaign_id),
      });
    },
  });
}

export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkDeleteLeadsBody) => {
      const { data, error } = await apiClient.DELETE("/api/email-outreach/leads/bulk", {
        body,
      });
      if (error) {
        throw new Error("Failed to bulk delete leads.");
      }
      return data as unknown;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: campaignQueryKeys.leads(variables.campaign_id),
      });
    },
  });
}

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";

type EmailLead = paths["/api/campaigns/{campaign_id}/leads"]["get"]["responses"][200]["content"]["application/json"][number];
type LinkedinLead =
  paths["/api/linkedin/campaigns/{campaign_id}/leads"]["get"]["responses"][200]["content"]["application/json"][number];

export interface NormalizedLead {
  id: string;
  campaign_id: string;
  campaign_name: string;
  channel: "email" | "linkedin";
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  title: string | null;
  status: string;
  category: string | null;
  updated_at: string;
}

export function useAllLeads(emailCampaignIds: string[], linkedinCampaignIds: string[]) {
  const emailLeadQueries = useQueries({
    queries: emailCampaignIds.map((campaignId) => ({
      queryKey: ["campaigns", campaignId, "leads"],
      queryFn: async () => {
        const { data, error } = await apiClient.GET("/api/campaigns/{campaign_id}/leads", {
          params: {
            path: {
              campaign_id: campaignId,
            },
          },
        });

        if (error) {
          throw new Error(`Failed to fetch leads for email campaign ${campaignId}.`);
        }

        return data ?? [];
      },
    })),
  });

  const linkedinLeadQueries = useQueries({
    queries: linkedinCampaignIds.map((campaignId) => ({
      queryKey: ["linkedin", campaignId, "leads"],
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
          throw new Error(`Failed to fetch leads for LinkedIn campaign ${campaignId}.`);
        }

        return data ?? [];
      },
    })),
  });

  return useMemo(() => {
    const allQueries = [...emailLeadQueries, ...linkedinLeadQueries];

    const leads: NormalizedLead[] = [
      ...emailLeadQueries.flatMap((query, index) =>
        (query.data ?? []).map((lead: EmailLead) =>
          normalizeLead(lead, emailCampaignIds[index], emailCampaignIds[index], "email")
        )
      ),
      ...linkedinLeadQueries.flatMap((query, index) =>
        (query.data ?? []).map((lead: LinkedinLead) =>
          normalizeLead(
            lead,
            linkedinCampaignIds[index],
            linkedinCampaignIds[index],
            "linkedin"
          )
        )
      ),
    ];

    const isLoading = allQueries.some((query) => query.isLoading || query.isFetching);
    const errorQuery = allQueries.find((query) => query.error);
    const loadedCampaigns = allQueries.filter((query) => query.isSuccess).length;

    return {
      leads,
      isLoading,
      error: (errorQuery?.error as Error | null) ?? null,
      loadedCampaigns,
      totalCampaigns: allQueries.length,
    };
  }, [emailCampaignIds, emailLeadQueries, linkedinCampaignIds, linkedinLeadQueries]);
}

function normalizeLead(
  lead: EmailLead | LinkedinLead,
  campaignId: string,
  campaignName: string,
  channel: "email" | "linkedin"
): NormalizedLead {
  return {
    id: lead.id,
    campaign_id: campaignId,
    campaign_name: campaignName,
    channel,
    email: lead.email ?? null,
    first_name: lead.first_name ?? null,
    last_name: lead.last_name ?? null,
    company_name: lead.company_name ?? null,
    title: lead.title ?? null,
    status: lead.status,
    category: lead.category ?? null,
    updated_at: lead.updated_at,
  };
}

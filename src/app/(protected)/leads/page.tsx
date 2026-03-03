"use client";

import { useMemo, useState } from "react";

import { RouteGuard } from "@/components/route-guard";
import { useCampaigns, useLinkedinCampaigns } from "@/features/campaigns/api";
import {
  LeadsFilters,
  type CampaignOption,
  type ChannelFilter,
} from "@/features/leads/components/leads-filters";
import {
  LeadSortDirection,
  LeadSortField,
  LeadsTable,
} from "@/features/leads/components/leads-table";
import {
  useAllLeads,
  type NormalizedLead,
} from "@/features/leads/api";
import { useAuth } from "@/lib/auth-context";
import { useCompanyContext, useCompanyFilters } from "@/lib/company-context";
import { formatNumber } from "@/lib/format";

export default function LeadsPage() {
  const { user } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const companyFilters = useCompanyFilters();
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [status, setStatus] = useState("");
  const [sortField, setSortField] = useState<LeadSortField>("updated");
  const [sortDirection, setSortDirection] = useState<LeadSortDirection>("desc");
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  const {
    data: emailCampaigns = [],
    isLoading: emailCampaignsLoading,
    error: emailCampaignsError,
  } = useCampaigns(toCampaignScopedFilters(companyFilters));
  const {
    data: linkedinCampaigns = [],
    isLoading: linkedinCampaignsLoading,
    error: linkedinCampaignsError,
  } = useLinkedinCampaigns(toCampaignScopedFilters(companyFilters));

  const emailCampaignIds = useMemo(
    () => emailCampaigns.map((campaign) => campaign.id),
    [emailCampaigns]
  );
  const linkedinCampaignIds = useMemo(
    () => linkedinCampaigns.map((campaign) => campaign.id),
    [linkedinCampaigns]
  );

  const {
    leads,
    isLoading: leadsLoading,
    error: leadsError,
    loadedCampaigns,
    totalCampaigns,
  } = useAllLeads(emailCampaignIds, linkedinCampaignIds);

  const campaignOptions = useMemo<CampaignOption[]>(() => {
    return [
      ...emailCampaigns.map((campaign) => ({
        id: `email:${campaign.id}`,
        name: campaign.name,
        channel: "email" as const,
      })),
      ...linkedinCampaigns.map((campaign) => ({
        id: `linkedin:${campaign.id}`,
        name: campaign.name,
        channel: "linkedin" as const,
      })),
    ];
  }, [emailCampaigns, linkedinCampaigns]);

  const campaignNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const campaign of emailCampaigns) {
      map.set(`email:${campaign.id}`, campaign.name);
    }
    for (const campaign of linkedinCampaigns) {
      map.set(`linkedin:${campaign.id}`, campaign.name);
    }
    return map;
  }, [emailCampaigns, linkedinCampaigns]);

  const enrichedLeads = useMemo<NormalizedLead[]>(
    () =>
      leads.map((lead) => ({
        ...lead,
        campaign_name:
          campaignNameMap.get(`${lead.channel}:${lead.campaign_id}`) ?? lead.campaign_name,
      })),
    [campaignNameMap, leads]
  );

  const filteredAndSortedLeads = useMemo(() => {
    const filtered = enrichedLeads.filter((lead) => {
      const haystack = `${lead.first_name ?? ""} ${lead.last_name ?? ""} ${lead.email ?? ""} ${
        lead.company_name ?? ""
      }`.toLowerCase();
      const searchMatch = haystack.includes(search.toLowerCase().trim());

      const campaignMatch =
        !selectedCampaign || `${lead.channel}:${lead.campaign_id}` === selectedCampaign;
      const channelMatch = channel === "all" || lead.channel === channel;
      const statusMatch = !status || lead.status === status;

      return searchMatch && campaignMatch && channelMatch && statusMatch;
    });

    return [...filtered].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortField === "updated") {
        const aTime = new Date(a.updated_at).getTime();
        const bTime = new Date(b.updated_at).getTime();
        return (aTime - bTime) * direction;
      }

      if (sortField === "name") {
        const aName = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.email || "";
        const bName = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim() || b.email || "";
        return aName.localeCompare(bName) * direction;
      }

      if (sortField === "campaign") {
        return a.campaign_name.localeCompare(b.campaign_name) * direction;
      }

      return a.status.localeCompare(b.status) * direction;
    });
  }, [channel, enrichedLeads, search, selectedCampaign, sortDirection, sortField, status]);

  const campaignsError = (emailCampaignsError as Error | null) ?? (linkedinCampaignsError as Error | null);
  const unifiedError = campaignsError ?? leadsError;

  const loadingProgressText =
    totalCampaigns > 0
      ? `Loading leads from ${loadedCampaigns}/${totalCampaigns} campaigns...`
      : undefined;

  return (
    <RouteGuard permission="leads.list">
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">Leads</h1>
        <p className="mt-1 text-zinc-400">View leads across all campaigns</p>
        {user?.role === "org_admin" && (
          <p className="mt-0.5 text-sm text-zinc-500">
            Viewing: {selectedCompany?.name ?? "All Companies"}
          </p>
        )}

        <div className="mt-6">
          <LeadsFilters
            search={search}
            onSearchChange={setSearch}
            campaignId={selectedCampaign}
            onCampaignChange={(value) => {
              setSelectedCampaign(value);
              setExpandedLeadId(null);
            }}
            channel={channel}
            onChannelChange={(value) => {
              setChannel(value);
              setExpandedLeadId(null);
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              setExpandedLeadId(null);
            }}
            campaignOptions={campaignOptions}
            allLeads={enrichedLeads}
          />
        </div>

        <p className="mt-4 text-sm text-zinc-400">
          Showing {formatNumber(filteredAndSortedLeads.length)} leads
        </p>

        <div className="mt-4">
          {!leadsLoading &&
          !emailCampaignsLoading &&
          !linkedinCampaignsLoading &&
          enrichedLeads.length === 0 &&
          !unifiedError ? (
            <p className="text-sm text-zinc-400">No leads in any campaign</p>
          ) : (
            <LeadsTable
              leads={filteredAndSortedLeads}
              isLoading={leadsLoading || emailCampaignsLoading || linkedinCampaignsLoading}
              loadingProgressText={loadingProgressText}
              error={unifiedError}
              expandedLeadId={expandedLeadId}
              onToggleExpandedLead={(leadId) =>
                setExpandedLeadId((current) => (current === leadId ? null : leadId))
              }
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={(field) => {
                if (field === sortField) {
                  setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
                  return;
                }
                setSortField(field);
                setSortDirection(field === "updated" ? "desc" : "asc");
              }}
            />
          )}
        </div>
      </div>
    </RouteGuard>
  );
}

function toCampaignScopedFilters(filters: ReturnType<typeof useCompanyFilters>) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
    ...(filters.mine_only !== undefined ? { mine_only: filters.mine_only } : {}),
  };
}

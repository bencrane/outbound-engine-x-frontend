"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Layers } from "lucide-react";

import { Gate, usePermission } from "@/components/gate";
import { RouteGuard } from "@/components/route-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBulkDeleteCampaigns,
  useCampaigns,
  useLinkedinCampaigns,
} from "@/features/campaigns/api";
import { CampaignBulkActions } from "@/features/campaigns/components/campaign-bulk-actions";
import { CreateCampaignDialog } from "@/features/campaigns/components/create-campaign-dialog";
import { CampaignStatusBadge } from "@/components/shared/campaign-status-badge";
import { useAuth } from "@/lib/auth-context";
import { useCompanyContext, useCompanyFilters } from "@/lib/company-context";
import { formatDate, formatRelativeTime } from "@/lib/format";

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "PAUSED"
  | "DRAFTED"
  | "COMPLETED"
  | "STOPPED";

type ChannelFilter = "all" | "email" | "linkedin" | "multi";

interface UnifiedCampaign {
  id: string;
  name: string;
  status: "DRAFTED" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";
  channel: "email" | "linkedin" | "multi";
  campaignType: "single_channel" | "multi_channel";
  created_at: string;
  updated_at: string;
}

const statusFilters: StatusFilter[] = [
  "ALL",
  "ACTIVE",
  "PAUSED",
  "DRAFTED",
  "COMPLETED",
  "STOPPED",
];

export default function CampaignsPage() {
  const { user } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const companyFilters = useCompanyFilters();
  const canCreate = usePermission("campaigns.create");
  const canManage = usePermission("campaigns.manage");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    data: emailCampaigns = [],
    isLoading: isEmailLoading,
    error: emailError,
  } = useCampaigns(toCampaignScopedFilters(companyFilters));
  const {
    data: linkedinCampaigns = [],
    isLoading: isLinkedinLoading,
    error: linkedinError,
  } = useLinkedinCampaigns(toCampaignScopedFilters(companyFilters));

  const campaigns = useMemo<UnifiedCampaign[]>(
    () =>
      [
        ...emailCampaigns.map((campaign) => ({
          ...(campaign as typeof campaign & {
            campaign_type?: "single_channel" | "multi_channel";
          }),
          channel:
            (campaign as { campaign_type?: "single_channel" | "multi_channel" }).campaign_type ===
            "multi_channel"
              ? ("multi" as const)
              : ("email" as const),
          campaignType:
            (campaign as { campaign_type?: "single_channel" | "multi_channel" }).campaign_type ===
            "multi_channel"
              ? ("multi_channel" as const)
              : ("single_channel" as const),
        })),
        ...linkedinCampaigns.map((campaign) => ({
          ...campaign,
          channel: "linkedin" as const,
          campaignType: "single_channel" as const,
        })),
      ]
        .map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          channel: campaign.channel,
          campaignType: campaign.campaignType,
          created_at: campaign.created_at,
          updated_at: campaign.updated_at,
        }))
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
    [emailCampaigns, linkedinCampaigns]
  );

  const filteredCampaigns = campaigns
    .filter((campaign) => {
      if (statusFilter === "ALL") {
        return true;
      }
      return campaign.status === statusFilter;
    })
    .filter((campaign) => channelFilter === "all" || campaign.channel === channelFilter)
    .filter((campaign) =>
      campaign.name.toLowerCase().includes(query.toLowerCase().trim())
    );
  const isLoading = isEmailLoading;
  const error = emailError as Error | null;
  const bulkDeleteCampaigns = useBulkDeleteCampaigns();
  const selectableCampaigns = filteredCampaigns.filter(
    (campaign) => campaign.channel === "email" && campaign.campaignType === "single_channel"
  );
  const allSelected =
    selectableCampaigns.length > 0 &&
    selectableCampaigns.every((campaign) => selectedCampaignIds.includes(campaign.id));

  return (
    <RouteGuard permission="campaigns.list">
      <div className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
            <p className="mt-1 text-zinc-400">Manage your outreach campaigns</p>
            {user?.company_id === null && (
              <p className="mt-0.5 text-sm text-zinc-500">
                Viewing: {selectedCompany?.name ?? "All Companies"}
              </p>
            )}
          </div>
          <Gate
            permission="campaigns.create"
            fallback={
              <Button disabled variant="default">
                + Create Campaign
              </Button>
            }
          >
            <Button disabled={!canCreate} onClick={() => setCreateDialogOpen(true)}>
              + Create Campaign
            </Button>
          </Gate>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {statusFilters.map((filter) => {
            const active = statusFilter === filter;
            return (
              <Button
                key={filter}
                variant={active ? "default" : "secondary"}
                size="sm"
                onClick={() => setStatusFilter(filter)}
              >
                {filter === "ALL" ? "All" : filter}
              </Button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={channelFilter === "all" ? "default" : "secondary"}
            size="sm"
            onClick={() => setChannelFilter("all")}
          >
            All Channels
          </Button>
          <Button
            variant={channelFilter === "email" ? "default" : "secondary"}
            size="sm"
            onClick={() => setChannelFilter("email")}
          >
            Email
          </Button>
          <Button
            variant={channelFilter === "linkedin" ? "default" : "secondary"}
            size="sm"
            onClick={() => setChannelFilter("linkedin")}
          >
            LinkedIn
          </Button>
          <Button
            variant={channelFilter === "multi" ? "default" : "secondary"}
            size="sm"
            onClick={() => setChannelFilter("multi")}
          >
            Multi-Channel
          </Button>
        </div>

        <div className="mt-4 max-w-sm">
          <Input
            placeholder="Search campaigns..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {linkedinError && (
          <p className="mt-4 text-sm text-amber-400">
            LinkedIn campaigns unavailable: {(linkedinError as Error).message}
          </p>
        )}

        <div className="mt-6">
          {error ? (
            <p className="text-sm text-red-400">{error.message}</p>
          ) : isLoading ? (
            <CampaignListSkeleton />
          ) : filteredCampaigns.length === 0 ? (
            <p className="text-sm text-zinc-400">No campaigns found</p>
          ) : (
            <>
              {canManage && (
                <CampaignBulkActions
                  selectedCount={selectedCampaignIds.length}
                  disabled={bulkDeleteCampaigns.isPending}
                  onDeleteSelected={() => {
                    if (selectedCampaignIds.length === 0) return;
                    if (!window.confirm(`Delete ${selectedCampaignIds.length} campaigns?`)) {
                      return;
                    }
                    bulkDeleteCampaigns.mutate(
                      { campaign_ids: selectedCampaignIds },
                      {
                        onSuccess: () => setSelectedCampaignIds([]),
                      }
                    );
                  }}
                />
              )}

              <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        {canManage && (
                          <Checkbox
                            checked={allSelected}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedCampaignIds(
                                  selectableCampaigns.map((campaign) => campaign.id)
                                );
                                return;
                              }
                              setSelectedCampaignIds([]);
                            }}
                          />
                        )}
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => {
                      const selectable =
                        campaign.channel === "email" && campaign.campaignType === "single_channel";
                      const selected = selectedCampaignIds.includes(campaign.id);
                      return (
                        <TableRow
                          key={campaign.id}
                          className={selected ? "bg-zinc-800/50" : undefined}
                        >
                          <TableCell>
                            {canManage && selectable ? (
                              <Checkbox
                                checked={selected}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setSelectedCampaignIds((current) =>
                                      current.includes(campaign.id)
                                        ? current
                                        : [...current, campaign.id]
                                    );
                                    return;
                                  }
                                  setSelectedCampaignIds((current) =>
                                    current.filter((id) => id !== campaign.id)
                                  );
                                }}
                              />
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/campaigns/${campaign.id}?channel=${campaign.channel}`}
                              className="font-medium hover:text-blue-400"
                            >
                              {campaign.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {campaign.campaignType === "multi_channel" ? (
                              <Badge variant="default" className="gap-1">
                                <Layers className="h-3 w-3" />
                                Multi-Channel
                              </Badge>
                            ) : (
                              <Badge variant={campaign.channel === "email" ? "default" : "secondary"}>
                                {campaign.channel === "email" ? "Email" : "LinkedIn"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <CampaignStatusBadge status={campaign.status} />
                          </TableCell>
                          <TableCell>{formatDate(campaign.created_at)}</TableCell>
                          <TableCell className="text-zinc-300">
                            {formatRelativeTime(campaign.updated_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {bulkDeleteCampaigns.error && (
                <p className="mt-2 text-sm text-red-400">Failed to bulk delete campaigns.</p>
              )}
            </>
          )}
        </div>
      </div>
      <CreateCampaignDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
    </RouteGuard>
  );
}

function toCampaignScopedFilters(filters: ReturnType<typeof useCompanyFilters>) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
    ...(filters.mine_only !== undefined ? { mine_only: filters.mine_only } : {}),
    ...(filters.all_companies ? { all_companies: filters.all_companies } : {}),
  };
}

function CampaignListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="grid grid-cols-6 gap-3 py-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

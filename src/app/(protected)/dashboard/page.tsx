"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Megaphone,
  Reply,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Gate, usePermission } from "@/components/gate";
import { RouteGuard } from "@/components/route-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import {
  useCompanyContext,
  useCompanyFilters,
  type CompanyFilters,
} from "@/lib/company-context";
import type { components } from "@/lib/api-types";
import {
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format";
import {
  useCampaignAnalytics,
  useClientAnalytics,
  useMessageSyncHealth,
  useReliabilityAnalytics,
  useWorkspaceCampaignEventsStats,
  useWorkspaceStats,
} from "@/features/analytics/api";
import { ClientAnalyticsSection } from "@/features/analytics/components/client-analytics-section";
import {
  DateRangeFilter,
  type DateRangePreset,
} from "@/components/shared/date-range-filter";
import { SystemHealthSection } from "@/features/analytics/components/system-health-section";
import { WorkspaceStatsSection } from "@/features/analytics/components/workspace-stats-section";
import { useRecentMessages } from "@/features/campaigns/api";
import { CampaignStatusBadge } from "@/components/shared/campaign-status-badge";
import { DirectMailDashboardSection } from "@/features/direct-mail/components/dashboard-section";

type MessageItem = components["schemas"]["OrgCampaignMessageResponse"];

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedCompany, selectedCompanyId } = useCompanyContext();
  const companyFilters = useCompanyFilters();
  const canViewAnalytics = usePermission("analytics.view");
  const isOrgAdmin = user?.role === "org_admin";
  const isGlobalView = isOrgAdmin && selectedCompanyId === null;

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activePreset, setActivePreset] = useState<DateRangePreset>("all");

  const fromTs = fromDate ? `${fromDate}T00:00:00.000Z` : undefined;
  const toTs = toDate ? `${toDate}T23:59:59.999Z` : undefined;

  const dateFilteredCampaignOptions = {
    ...toCampaignScopedFilters(companyFilters),
    ...(fromTs ? { from_ts: fromTs } : {}),
    ...(toTs ? { to_ts: toTs } : {}),
  };

  const clientAnalyticsOptions = isGlobalView
    ? {
        ...toAnalyticsScopedFilters(companyFilters),
        ...(fromTs ? { from_ts: fromTs } : {}),
        ...(toTs ? { to_ts: toTs } : {}),
      }
    : undefined;

  const {
    data: campaignAnalytics = [],
    isLoading: isCampaignAnalyticsLoading,
    error: campaignAnalyticsError,
  } = useCampaignAnalytics(dateFilteredCampaignOptions);

  const {
    data: clientAnalytics = [],
    isLoading: isClientAnalyticsLoading,
    error: clientAnalyticsError,
  } = useClientAnalytics(clientAnalyticsOptions);

  const {
    data: reliabilityAnalytics,
    isLoading: isReliabilityLoading,
    error: reliabilityError,
  } = useReliabilityAnalytics(
    isGlobalView
      ? {
          ...toReliabilityScopedFilters(companyFilters),
          ...(fromTs ? { from_ts: fromTs } : {}),
          ...(toTs ? { to_ts: toTs } : {}),
        }
      : undefined
  );

  const {
    data: messageSyncHealth = [],
    isLoading: isMessageSyncLoading,
    error: messageSyncError,
  } = useMessageSyncHealth(
    isGlobalView ? toMessageSyncScopedFilters(companyFilters) : undefined
  );

  const {
    data: recentMessages = [],
    isLoading: isRecentMessagesLoading,
    error: recentMessagesError,
  } = useRecentMessages(toRecentMessageScopedFilters(companyFilters));

  const {
    data: workspaceStats = {},
    isLoading: isWorkspaceStatsLoading,
    error: workspaceStatsError,
  } = useWorkspaceStats(fromDate || undefined, toDate || undefined);

  const {
    data: workspaceCampaignEventsStats = {},
    isLoading: isWorkspaceCampaignEventsStatsLoading,
    error: workspaceCampaignEventsStatsError,
  } = useWorkspaceCampaignEventsStats(fromDate || undefined, toDate || undefined);

  const totalCampaigns = campaignAnalytics.length;
  const activeLeads = campaignAnalytics.reduce(
    (sum, campaign) => sum + campaign.leads_total,
    0
  );
  const messagesSent = campaignAnalytics.reduce(
    (sum, campaign) => sum + campaign.outbound_messages_total,
    0
  );
  const avgReplyRate =
    totalCampaigns > 0
      ? campaignAnalytics.reduce((sum, campaign) => sum + campaign.reply_rate, 0) /
        totalCampaigns
      : 0;

  const sortedCampaigns = [...campaignAnalytics].sort((a, b) => {
    const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
    const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
    return bTime - aTime;
  });

  const systemHealthError = (reliabilityError as Error | null) ?? (messageSyncError as Error | null);
  const workspaceError =
    (workspaceStatsError as Error | null) ??
    (workspaceCampaignEventsStatsError as Error | null);

  const hasDateRange = Boolean(fromDate && toDate);

  return (
    <RouteGuard permission="dashboard.view">
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-zinc-400">Overview of your outreach performance</p>
        {isOrgAdmin && (
          <p className="mt-0.5 text-sm text-zinc-500">
            Viewing: {selectedCompany?.name ?? "All Companies"}
          </p>
        )}
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          activePreset={activePreset}
          onFromDateChange={(value) => {
            setFromDate(value);
            setActivePreset("all");
          }}
          onToDateChange={(value) => {
            setToDate(value);
            setActivePreset("all");
          }}
          onPresetChange={(preset) => {
            setActivePreset(preset);
            if (preset === "all") {
              setFromDate("");
              setToDate("");
              return;
            }
            const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
            const today = new Date();
            const to = toInputDate(today);
            const fromValue = new Date(today);
            fromValue.setDate(today.getDate() - (days - 1));
            setFromDate(toInputDate(fromValue));
            setToDate(to);
          }}
        />

        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Campaigns"
            value={formatNumber(totalCampaigns)}
            icon={Megaphone}
            isLoading={isCampaignAnalyticsLoading}
          />
          <StatCard
            label="Active Leads"
            value={formatNumber(activeLeads)}
            icon={Users}
            isLoading={isCampaignAnalyticsLoading}
          />
          <StatCard
            label="Messages Sent"
            value={formatNumber(messagesSent)}
            icon={Send}
            isLoading={isCampaignAnalyticsLoading}
          />
          <StatCard
            label="Avg Reply Rate"
            value={formatPercent(avgReplyRate)}
            icon={Reply}
            isLoading={isCampaignAnalyticsLoading}
          />
        </section>

        {isGlobalView && (
          <Gate permission="analytics.view">
            <section className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Client Performance</CardTitle>
                  <CardDescription>Per-company analytics rollup</CardDescription>
                </CardHeader>
                <CardContent>
                  <ClientAnalyticsSection
                    items={clientAnalytics}
                    isLoading={isClientAnalyticsLoading}
                    error={clientAnalyticsError as Error | null}
                  />
                </CardContent>
              </Card>
            </section>
          </Gate>
        )}

        {canViewAnalytics && (
          <section className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Activity</CardTitle>
                <CardDescription>
                  Workspace and campaign event metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasDateRange ? (
                  <p className="text-sm text-zinc-400">
                    Select a date range to load workspace activity.
                  </p>
                ) : (
                  <WorkspaceStatsSection
                    workspaceStats={workspaceStats}
                    campaignEventsStats={workspaceCampaignEventsStats}
                    isLoading={
                      isWorkspaceStatsLoading || isWorkspaceCampaignEventsStatsLoading
                    }
                    error={workspaceError}
                  />
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {isGlobalView && (
          <Gate permission="analytics.view">
            <section className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>
                    Reliability and message sync status across campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SystemHealthSection
                    reliability={reliabilityAnalytics ?? null}
                    messageSyncHealth={messageSyncHealth}
                    isLoading={isReliabilityLoading || isMessageSyncLoading}
                    error={systemHealthError}
                  />
                </CardContent>
              </Card>
            </section>
          </Gate>
        )}

        {isOrgAdmin && (
          <Gate permission="direct-mail.view">
            <section className="mt-8">
              <DirectMailDashboardSection from_ts={fromTs} to_ts={toTs} />
            </section>
          </Gate>
        )}

        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Performance across all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignAnalyticsError ? (
                <p className="text-sm text-red-400">
                  Failed to load campaign analytics.
                </p>
              ) : isCampaignAnalyticsLoading ? (
                <CampaignTableSkeleton />
              ) : sortedCampaigns.length === 0 ? (
                <p className="text-sm text-zinc-400">No campaigns yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="px-3 py-3 text-left font-medium">Campaign</th>
                        <th className="px-3 py-3 text-left font-medium">Status</th>
                        <th className="px-3 py-3 text-right font-medium">Leads</th>
                        <th className="px-3 py-3 text-right font-medium">Sent</th>
                        <th className="px-3 py-3 text-right font-medium">Replies</th>
                        <th className="px-3 py-3 text-right font-medium">Reply Rate</th>
                        <th className="px-3 py-3 text-right font-medium">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCampaigns.map((campaign) => (
                        <tr key={campaign.campaign_id} className="border-b border-zinc-800/70">
                          <td className="px-3 py-3 text-white">
                            <Link
                              href={`/campaigns/${campaign.campaign_id}`}
                              className="hover:text-blue-400"
                            >
                              {campaign.campaign_name}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <CampaignStatusBadge status={campaign.campaign_status} />
                          </td>
                          <td className="px-3 py-3 text-right text-white">
                            {formatNumber(campaign.leads_total)}
                          </td>
                          <td className="px-3 py-3 text-right text-white">
                            {formatNumber(campaign.outbound_messages_total)}
                          </td>
                          <td className="px-3 py-3 text-right text-white">
                            {formatNumber(campaign.replies_total)}
                          </td>
                          <td className="px-3 py-3 text-right text-white">
                            {formatPercent(campaign.reply_rate)}
                          </td>
                          <td className="px-3 py-3 text-right text-zinc-300">
                            {campaign.last_activity_at
                              ? formatRelativeTime(campaign.last_activity_at)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest campaign messages and replies</CardDescription>
            </CardHeader>
            <CardContent>
              {recentMessagesError ? (
                <p className="text-sm text-red-400">
                  Failed to load recent activity.
                </p>
              ) : isRecentMessagesLoading ? (
                <RecentActivitySkeleton />
              ) : recentMessages.length === 0 ? (
                <p className="text-sm text-zinc-400">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentMessages.map((message) => (
                    <RecentActivityItem key={message.id} message={message} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </RouteGuard>
  );
}

function toCampaignScopedFilters(filters: CompanyFilters) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
    ...(filters.mine_only !== undefined ? { mine_only: filters.mine_only } : {}),
  };
}

function toAnalyticsScopedFilters(filters: CompanyFilters) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
    ...(filters.mine_only !== undefined ? { mine_only: filters.mine_only } : {}),
  };
}

function toReliabilityScopedFilters(filters: CompanyFilters) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
  };
}

function toRecentMessageScopedFilters(filters: CompanyFilters) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
    ...(filters.mine_only !== undefined ? { mine_only: filters.mine_only } : {}),
    ...(filters.all_companies !== undefined ? { all_companies: filters.all_companies } : {}),
  };
}

function toMessageSyncScopedFilters(filters: CompanyFilters) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
  };
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string;
  icon: typeof Megaphone;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="h-4 w-4 text-zinc-400" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-3xl font-semibold text-white">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-7 gap-3 py-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </div>
  );
}

function RecentActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-zinc-800 p-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function RecentActivityItem({ message }: { message: MessageItem }) {
  const isInbound = message.direction === "inbound";
  const timestamp = message.sent_at ?? message.updated_at;
  const bodyPreview = message.body?.trim() ? message.body.trim().slice(0, 100) : "";

  return (
    <div className="rounded-lg border border-zinc-800 p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isInbound ? (
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-blue-400" />
          )}
          <p className="text-sm font-medium text-white">
            {message.subject?.trim() || (
              <span className="text-zinc-400">No subject</span>
            )}
          </p>
        </div>
        <p className="text-xs text-zinc-400">{formatRelativeTime(timestamp)}</p>
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        {bodyPreview || <span className="text-zinc-500">No message body</span>}
        {message.body && message.body.length > 100 ? "..." : ""}
      </p>
    </div>
  );
}

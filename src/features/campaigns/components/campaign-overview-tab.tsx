"use client";

import { Megaphone, Reply, Send, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  useCampaignAnalyticsSummary,
  useSequenceStepPerformance,
} from "@/features/campaigns/api";
import { ProviderAnalyticsCard } from "@/features/campaigns/components/provider-analytics-card";
import { formatNumber, formatPercent } from "@/lib/format";

interface CampaignOverviewTabProps {
  campaignId: string;
}

export function CampaignOverviewTab({ campaignId }: CampaignOverviewTabProps) {
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useCampaignAnalyticsSummary(campaignId);
  const {
    data: sequencePerformance = [],
    isLoading: sequenceLoading,
    error: sequenceError,
  } = useSequenceStepPerformance(campaignId);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewStatCard
          label="Total Leads"
          icon={Users}
          value={summary ? formatNumber(summary.leads_total) : "0"}
          isLoading={summaryLoading}
        />
        <OverviewStatCard
          label="Active Leads"
          icon={Megaphone}
          value={summary ? formatNumber(summary.leads_active) : "0"}
          isLoading={summaryLoading}
        />
        <OverviewStatCard
          label="Messages Sent"
          icon={Send}
          value={summary ? formatNumber(summary.outbound_messages_total) : "0"}
          isLoading={summaryLoading}
        />
        <OverviewStatCard
          label="Reply Rate"
          icon={Reply}
          value={summary ? formatPercent(summary.reply_rate) : "0.0%"}
          isLoading={summaryLoading}
        />
      </section>

      {summaryError ? (
        <p className="text-sm text-red-400">Failed to load campaign overview.</p>
      ) : (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads Breakdown</CardTitle>
              <CardDescription>Current lead status totals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {summaryLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : (
                <>
                  <Row label="Active" value={formatNumber(summary?.leads_active ?? 0)} />
                  <Row label="Paused" value={formatNumber(summary?.leads_paused ?? 0)} />
                  <Row
                    label="Unsubscribed"
                    value={formatNumber(summary?.leads_unsubscribed ?? 0)}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Replies</CardTitle>
              <CardDescription>Total replies to this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-semibold text-white">
                  {formatNumber(summary?.replies_total ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sequence Step Performance</CardTitle>
          <CardDescription>Performance by sequence step</CardDescription>
        </CardHeader>
        <CardContent>
          {sequenceError ? (
            <p className="text-sm text-red-400">Failed to load sequence performance.</p>
          ) : sequenceLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          ) : sequencePerformance.length === 0 ? (
            <p className="text-sm text-zinc-400">No sequence data</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Replies</TableHead>
                    <TableHead className="text-right">Reply Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequencePerformance.map((step) => (
                    <TableRow key={step.sequence_step_number}>
                      <TableCell>Step {step.sequence_step_number}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(step.outbound_messages_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(step.replies_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercent(step.reply_rate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProviderAnalyticsCard campaignId={campaignId} />
    </div>
  );
}

function OverviewStatCard({
  label,
  value,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string;
  icon: typeof Users;
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
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="text-3xl font-semibold text-white">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

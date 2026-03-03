"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { components } from "@/lib/api-types";
import { formatNumber, formatPercent, formatRelativeTime } from "@/lib/format";
import { CampaignStatusBadge } from "@/components/shared/campaign-status-badge";

type ReliabilityResponse = components["schemas"]["ReliabilityAnalyticsResponse"];
type MessageSyncItem = components["schemas"]["MessageSyncHealthItem"];

interface SystemHealthSectionProps {
  reliability: ReliabilityResponse | null;
  messageSyncHealth: MessageSyncItem[];
  isLoading: boolean;
  error: Error | null;
}

export function SystemHealthSection({
  reliability,
  messageSyncHealth,
  isLoading,
  error,
}: SystemHealthSectionProps) {
  if (error) {
    return <p className="text-sm text-red-400">Failed to load system health data.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const eventsTotal = reliability?.events_total ?? 0;
  const errorsTotal = reliability?.errors_total ?? 0;
  const replayed = reliability?.replayed_events_total ?? 0;
  const errorRate = eventsTotal > 0 ? errorsTotal / eventsTotal : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Events Total" value={formatNumber(eventsTotal)} />
        <Stat label="Errors Total" value={formatNumber(errorsTotal)} />
        <Stat label="Replayed Events" value={formatNumber(replayed)} />
        <Stat label="Error Rate" value={formatPercent(errorRate)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead className="text-right">Errors</TableHead>
              <TableHead className="text-right">Replayed</TableHead>
              <TableHead className="text-right">Error Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reliability?.by_provider ?? []).map((provider) => {
              const providerErrorRate =
                provider.events_total > 0 ? provider.errors_total / provider.events_total : 0;
              return (
                <TableRow key={provider.provider_slug}>
                  <TableCell>{provider.provider_slug}</TableCell>
                  <TableCell className="text-right">{formatNumber(provider.events_total)}</TableCell>
                  <TableCell className="text-right">{formatNumber(provider.errors_total)}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(provider.replayed_events_total)}
                  </TableCell>
                  <TableCell className="text-right">{formatPercent(providerErrorRate)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sync Status</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead className="text-right">Messages</TableHead>
              <TableHead className="text-right">Inbound</TableHead>
              <TableHead className="text-right">Outbound</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messageSyncHealth.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-zinc-400">
                  No message sync health data available.
                </TableCell>
              </TableRow>
            ) : (
              messageSyncHealth.map((item) => (
                <TableRow key={`${item.company_id}:${item.campaign_id}`}>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{item.campaign_name}</p>
                      {item.last_message_sync_error && (
                        <p className="text-xs text-red-400">{item.last_message_sync_error}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={item.campaign_status} />
                  </TableCell>
                  <TableCell>{syncBadge(item.message_sync_status)}</TableCell>
                  <TableCell>
                    {item.last_message_sync_at
                      ? formatRelativeTime(item.last_message_sync_at)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(item.messages_total)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.inbound_total)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.outbound_total)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function syncBadge(status: string | null | undefined) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  const normalized = status.toLowerCase();
  if (normalized.includes("error") || normalized.includes("fail")) {
    return <Badge variant="destructive">{status}</Badge>;
  }
  if (normalized.includes("ok") || normalized.includes("healthy") || normalized.includes("sync")) {
    return <Badge variant="success">{status}</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

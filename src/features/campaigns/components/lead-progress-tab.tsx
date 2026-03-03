"use client";

import { Fragment, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
  useCampaignLeads,
  useLeadProgress,
  useMultiChannelSequence,
  useSingleLeadProgress,
} from "@/features/campaigns/api";
import { ChannelIcon } from "@/features/campaigns/components/channel-icon";
import { StepProgressBadge } from "@/features/campaigns/components/step-progress-badge";
import { formatDateTime } from "@/lib/format";

interface LeadProgressTabProps {
  campaignId: string;
}

const STATUS_FILTERS = [
  "all",
  "pending",
  "executing",
  "executed",
  "skipped",
  "failed",
  "completed",
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

export function LeadProgressTab({ campaignId }: LeadProgressTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedLeadId, setExpandedLeadId] = useState<string>("");

  const { data: leads = [] } = useCampaignLeads(campaignId);
  const { data: sequence = [] } = useMultiChannelSequence(campaignId);
  const {
    data: progress = [],
    isLoading,
    error,
  } = useLeadProgress(
    campaignId,
    statusFilter === "all" ? undefined : { step_status: statusFilter }
  );
  const {
    data: expandedLeadProgress,
    isLoading: expandedLoading,
    error: expandedError,
  } = useSingleLeadProgress(campaignId, expandedLeadId);

  const leadsById = useMemo(
    () =>
      new Map(
        leads.map((lead) => [
          lead.id,
          `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || lead.email || lead.id,
        ])
      ),
    [leads]
  );

  const sequenceByOrder = useMemo(
    () => new Map(sequence.map((step) => [step.step_order, step.channel])),
    [sequence]
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Lead Progress</h3>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant={statusFilter === filter ? "default" : "secondary"}
            onClick={() => setStatusFilter(filter)}
          >
            {filter === "all" ? "All" : toLabel(filter)}
          </Button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-400">Failed to load lead progress.</p>
      ) : isLoading ? (
        <ProgressTableSkeleton />
      ) : progress.length === 0 ? (
        <p className="text-sm text-zinc-400">No lead progress yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Current Step</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Execute</TableHead>
                <TableHead>Executed At</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Last Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {progress.map((row) => {
                const isExpanded = expandedLeadId === row.lead_id;
                const channel = sequenceByOrder.get(row.current_step_order);
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedLeadId((current) => (current === row.lead_id ? "" : row.lead_id))
                      }
                    >
                      <TableCell>{leadsById.get(row.lead_id) ?? row.lead_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {channel && <ChannelIcon channel={channel} className="h-4 w-4 text-zinc-400" />}
                          <span>Step {row.current_step_order}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StepProgressBadge status={row.step_status} />
                      </TableCell>
                      <TableCell>{formatOrDash(row.next_execute_at)}</TableCell>
                      <TableCell>{formatOrDash(row.executed_at)}</TableCell>
                      <TableCell>{row.attempts}</TableCell>
                      <TableCell className={row.last_error ? "text-red-300" : "text-zinc-500"}>
                        {row.last_error ?? "-"}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-zinc-900/50">
                          {expandedLoading ? (
                            <p className="text-sm text-zinc-400">Loading lead details...</p>
                          ) : expandedError ? (
                            <p className="text-sm text-red-400">Failed to load lead detail.</p>
                          ) : expandedLeadProgress ? (
                            <div className="grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
                              <p>Lead ID: {expandedLeadProgress.lead_id}</p>
                              <p>Status: {toLabel(expandedLeadProgress.step_status)}</p>
                              <p>
                                Next Execute: {formatOrDash(expandedLeadProgress.next_execute_at)}
                              </p>
                              <p>Executed At: {formatOrDash(expandedLeadProgress.executed_at)}</p>
                              <p>
                                Completed At: {formatOrDash(expandedLeadProgress.completed_at)}
                              </p>
                              <p>Attempts: {expandedLeadProgress.attempts}</p>
                              <p className="md:col-span-2">
                                Last Error: {expandedLeadProgress.last_error ?? "-"}
                              </p>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function toLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatOrDash(dateValue: string | null) {
  if (!dateValue) {
    return "-";
  }
  return formatDateTime(dateValue);
}

function ProgressTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="grid grid-cols-7 gap-3 py-2">
          {Array.from({ length: 7 }).map((__, colIdx) => (
            <Skeleton key={colIdx} className="h-5 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

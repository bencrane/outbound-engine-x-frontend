"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Fragment } from "react";

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
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";
import { LeadDetailPanel } from "@/features/leads/components/lead-detail-panel";
import type { NormalizedLead } from "@/features/leads/api";
import type { components } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format";

export type LeadSortField = "name" | "campaign" | "status" | "updated";
export type LeadSortDirection = "asc" | "desc";

interface LeadsTableProps {
  leads: NormalizedLead[];
  isLoading: boolean;
  loadingProgressText?: string;
  error: Error | null;
  expandedLeadId: string | null;
  onToggleExpandedLead: (leadId: string) => void;
  sortField: LeadSortField;
  sortDirection: LeadSortDirection;
  onSortChange: (field: LeadSortField) => void;
}

export function LeadsTable({
  leads,
  isLoading,
  loadingProgressText,
  error,
  expandedLeadId,
  onToggleExpandedLead,
  sortField,
  sortDirection,
  onSortChange,
}: LeadsTableProps) {
  if (error) {
    return <p className="text-sm text-red-400">Failed to load leads.</p>;
  }

  if (isLoading) {
    return (
      <div>
        {loadingProgressText && (
          <p className="mb-3 text-sm text-zinc-400">{loadingProgressText}</p>
        )}
        <LeadsTableSkeleton />
      </div>
    );
  }

  if (leads.length === 0) {
    return <p className="text-sm text-zinc-400">No leads found</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              label="Name"
              field="name"
              activeField={sortField}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <SortableHead
              label="Campaign"
              field="campaign"
              activeField={sortField}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <TableHead>Channel</TableHead>
            <SortableHead
              label="Status"
              field="status"
              activeField={sortField}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <SortableHead
              label="Updated"
              field="updated"
              activeField={sortField}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const fullName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
            const leadKey = `${lead.channel}:${lead.campaign_id}:${lead.id}`;
            const isExpanded = expandedLeadId === leadKey;

            return (
              <Fragment key={leadKey}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => onToggleExpandedLead(leadKey)}
                >
                  <TableCell className="font-medium">
                    {fullName || lead.email || "Unknown lead"}
                  </TableCell>
                  <TableCell className="text-zinc-400">{lead.email ?? "-"}</TableCell>
                  <TableCell>{lead.company_name ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{lead.campaign_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.channel === "email" ? "default" : "secondary"}>
                      {lead.channel === "email" ? "Email" : "LinkedIn"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={toLeadStatus(lead.status)} />
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {formatRelativeTime(lead.updated_at)}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="bg-zinc-900/50">
                      <LeadDetailPanel
                        lead={lead}
                        onClose={() => onToggleExpandedLead(leadKey)}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SortableHead({
  label,
  field,
  activeField,
  direction,
  onSortChange,
}: {
  label: string;
  field: LeadSortField;
  activeField: LeadSortField;
  direction: LeadSortDirection;
  onSortChange: (field: LeadSortField) => void;
}) {
  const isActive = activeField === field;

  return (
    <TableHead
      className="cursor-pointer hover:text-white"
      onClick={() => onSortChange(field)}
    >
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : null}
      </div>
    </TableHead>
  );
}

function LeadsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-7 gap-3 py-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

type LeadStatus = components["schemas"]["CampaignLeadResponse"]["status"];

function toLeadStatus(status: string): LeadStatus {
  const supported: LeadStatus[] = [
    "active",
    "paused",
    "unsubscribed",
    "replied",
    "bounced",
    "pending",
    "contacted",
    "connected",
    "not_interested",
    "unknown",
  ];
  return supported.includes(status as LeadStatus) ? (status as LeadStatus) : "unknown";
}

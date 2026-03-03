"use client";

import { X } from "lucide-react";

import { InboxThreadMessage } from "@/components/shared/inbox-thread-message";
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeadThread } from "@/features/inbox/api";
import type { NormalizedLead } from "@/features/leads/api";
import type { components } from "@/lib/api-types";

interface LeadDetailPanelProps {
  lead: NormalizedLead;
  onClose: () => void;
}

export function LeadDetailPanel({ lead, onClose }: LeadDetailPanelProps) {
  const isEmailLead = lead.channel === "email";
  const {
    data: thread = [],
    isLoading,
    error,
  } = useLeadThread(isEmailLead ? lead.campaign_id : null, isEmailLead ? lead.id : null);

  const orderedThread = [...thread].sort((a, b) => {
    const aTime = new Date(a.sent_at ?? a.updated_at).getTime();
    const bTime = new Date(b.sent_at ?? b.updated_at).getTime();
    return aTime - bTime;
  });

  const fullName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || lead.email || "Unknown lead";

  return (
    <Card className="bg-zinc-900/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{fullName}</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">{lead.email ?? "No email"}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {lead.company_name ?? "Unknown company"}
              {lead.title ? ` - ${lead.title}` : ""}
            </p>
            <div className="mt-2">
              <LeadStatusBadge status={toLeadStatus(lead.status)} />
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close lead detail">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-red-400">Failed to load message history.</p>
        ) : !isEmailLead ? (
          <p className="text-sm text-zinc-400">
            No message history available for LinkedIn leads.
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-zinc-800 p-4">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="mt-2 h-4 w-40" />
                <Skeleton className="mt-3 h-24 w-full" />
              </div>
            ))}
          </div>
        ) : orderedThread.length === 0 ? (
          <p className="text-sm text-zinc-400">No message history</p>
        ) : (
          <div className="space-y-3">
            {orderedThread.map((message) => (
              <InboxThreadMessage key={message.id} message={message} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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

"use client";

import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useLinkedinCampaignLeads,
  useLinkedinLeadStatusUpdate,
  useSendLinkedinMessage,
} from "@/features/campaigns/api";
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";

interface LinkedinLeadsTabProps {
  campaignId: string;
}

const linkedinStatuses = [
  "pending",
  "contacted",
  "replied",
  "connected",
  "not_interested",
  "bounced",
] as const;

export function LinkedinLeadsTab({ campaignId }: LinkedinLeadsTabProps) {
  const [query, setQuery] = useState("");
  const [messagingLeadId, setMessagingLeadId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canManage = usePermission("campaigns.manage");

  const { data: leads = [], isLoading, error } = useLinkedinCampaignLeads(campaignId);
  const updateLeadStatus = useLinkedinLeadStatusUpdate();
  const sendMessage = useSendLinkedinMessage();

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
        const haystack = `${name} ${lead.email ?? ""} ${lead.company_name ?? ""}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [leads, query]
  );
  const messagingLead = leads.find((lead) => lead.id === messagingLeadId) ?? null;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search leads by name, email, or company..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {error ? (
        <p className="text-sm text-red-400">Failed to load LinkedIn campaign leads.</p>
      ) : isLoading ? (
        <LeadsTableSkeleton />
      ) : filteredLeads.length === 0 ? (
        <p className="text-sm text-zinc-400">No leads found</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => {
                const fullName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
                return (
                  <TableRow key={lead.id}>
                    <TableCell>{fullName || lead.email || "Unknown"}</TableCell>
                    <TableCell className="text-zinc-400">{lead.email ?? "-"}</TableCell>
                    <TableCell>{lead.company_name ?? "-"}</TableCell>
                    <TableCell>{lead.title ?? "-"}</TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="LinkedIn lead actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {linkedinStatuses.map((status) => (
                              <DropdownMenuItem
                                key={`${lead.id}-${status}`}
                                onClick={() => {
                                  setSuccessMessage(null);
                                  updateLeadStatus.mutate({
                                    campaignId,
                                    leadId: lead.id,
                                    status,
                                  });
                                }}
                              >
                                Set status: {humanizeStatus(status)}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                              onClick={() => {
                                setSuccessMessage(null);
                                setMessagingLeadId(lead.id);
                              }}
                            >
                              Send Message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {updateLeadStatus.error && (
        <p className="text-sm text-red-400">Failed to update lead status.</p>
      )}

      {messagingLead && canManage && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm font-medium text-white">
            Send message to{" "}
            {`${messagingLead.first_name ?? ""} ${messagingLead.last_name ?? ""}`.trim() ||
              messagingLead.email ||
              "lead"}
          </p>
          <Textarea
            className="mt-3"
            placeholder="Write your LinkedIn message..."
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
          />
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              disabled={sendMessage.isPending || !messageDraft.trim()}
              onClick={() => {
                if (!messagingLead || !messageDraft.trim()) return;
                setSuccessMessage(null);
                sendMessage.mutate(
                  {
                    campaignId,
                    leadId: messagingLead.id,
                    message: messageDraft.trim(),
                  },
                  {
                    onSuccess: () => {
                      setMessageDraft("");
                      setSuccessMessage("Message sent.");
                    },
                  }
                );
              }}
            >
              Send
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={sendMessage.isPending}
              onClick={() => {
                setMessagingLeadId(null);
                setMessageDraft("");
              }}
            >
              Cancel
            </Button>
          </div>
          {sendMessage.error && (
            <p className="mt-2 text-sm text-red-400">Failed to send LinkedIn message.</p>
          )}
          {successMessage && <p className="mt-2 text-sm text-emerald-400">{successMessage}</p>}
        </div>
      )}
    </div>
  );
}

function humanizeStatus(status: (typeof linkedinStatuses)[number]) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function LeadsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="grid grid-cols-6 gap-3 py-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-10 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

"use client";

import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  useBulkCreateLeadsCsv,
  useBulkDeleteLeads,
  useBulkUpdateLeadStatus,
  useCampaignLeads,
  usePauseCampaignLead,
  useResumeCampaignLead,
  useUnsubscribeCampaignLead,
} from "@/features/campaigns/api";
import { CsvImportDialog } from "@/features/campaigns/components/csv-import-dialog";
import { LeadBulkActions } from "@/features/campaigns/components/lead-bulk-actions";
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";

interface CampaignLeadsTabProps {
  campaignId: string;
}

export function CampaignLeadsTab({ campaignId }: CampaignLeadsTabProps) {
  const [query, setQuery] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const canManage = usePermission("campaigns.manage");

  const { data: leads = [], isLoading, error } = useCampaignLeads(campaignId);
  const pauseLead = usePauseCampaignLead();
  const resumeLead = useResumeCampaignLead();
  const unsubscribeLead = useUnsubscribeCampaignLead();
  const bulkUpdateStatus = useBulkUpdateLeadStatus();
  const bulkDeleteLeads = useBulkDeleteLeads();
  const bulkCreateLeadsCsv = useBulkCreateLeadsCsv();

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
        const haystack = `${name} ${lead.email ?? ""}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [leads, query]
  );
  const allSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((lead) => selectedLeadIds.includes(lead.id));
  const actionPending = bulkUpdateStatus.isPending || bulkDeleteLeads.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search leads by name or email..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-lg"
        />
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setCsvDialogOpen(true)}>
            Import CSV
          </Button>
        )}
      </div>

      {canManage && (
        <LeadBulkActions
          selectedCount={selectedLeadIds.length}
          disabled={actionPending}
          statusValue={bulkStatus}
          onStatusValueChange={setBulkStatus}
          onApplyStatus={() => {
            if (!bulkStatus || selectedLeadIds.length === 0) return;
            bulkUpdateStatus.mutate(
              {
                campaign_id: campaignId,
                lead_ids: selectedLeadIds,
                status: bulkStatus,
              },
              {
                onSuccess: () => {
                  setBulkStatus("");
                  setSelectedLeadIds([]);
                },
              }
            );
          }}
          onDeleteSelected={() => {
            if (selectedLeadIds.length === 0) return;
            if (!window.confirm(`Delete ${selectedLeadIds.length} selected leads?`)) return;
            bulkDeleteLeads.mutate(
              {
                campaign_id: campaignId,
                lead_ids: selectedLeadIds,
              },
              {
                onSuccess: () => setSelectedLeadIds([]),
              }
            );
          }}
        />
      )}

      {error ? (
        <p className="text-sm text-red-400">Failed to load campaign leads.</p>
      ) : isLoading ? (
        <LeadsTableSkeleton />
      ) : filteredLeads.length === 0 ? (
        <p className="text-sm text-zinc-400">No leads found</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {canManage && (
                    <Checkbox
                      checked={allSelected}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedLeadIds(filteredLeads.map((lead) => lead.id));
                          return;
                        }
                        setSelectedLeadIds([]);
                      }}
                    />
                  )}
                </TableHead>
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
                const selected = selectedLeadIds.includes(lead.id);
                return (
                  <TableRow key={lead.id} className={selected ? "bg-zinc-800/50" : undefined}>
                    <TableCell>
                      {canManage ? (
                        <Checkbox
                          checked={selected}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedLeadIds((current) =>
                                current.includes(lead.id) ? current : [...current, lead.id]
                              );
                              return;
                            }
                            setSelectedLeadIds((current) =>
                              current.filter((id) => id !== lead.id)
                            );
                          }}
                        />
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </TableCell>
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
                            <Button variant="ghost" size="icon" aria-label="Lead actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {["active", "contacted", "connected", "replied"].includes(
                              lead.status
                            ) && (
                              <DropdownMenuItem
                                onClick={() =>
                                  pauseLead.mutate({
                                    campaignId,
                                    leadId: lead.id,
                                  })
                                }
                              >
                                Pause
                              </DropdownMenuItem>
                            )}
                            {lead.status === "paused" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  resumeLead.mutate({
                                    campaignId,
                                    leadId: lead.id,
                                  })
                                }
                              >
                                Resume
                              </DropdownMenuItem>
                            )}
                            {["active", "contacted", "connected", "replied", "paused"].includes(
                              lead.status
                            ) && (
                              <DropdownMenuItem
                                className="text-red-300 hover:text-red-200"
                                onClick={() =>
                                  unsubscribeLead.mutate({
                                    campaignId,
                                    leadId: lead.id,
                                  })
                                }
                              >
                                Unsubscribe
                              </DropdownMenuItem>
                            )}
                            {["unsubscribed", "bounced"].includes(lead.status) && (
                              <DropdownMenuItem className="cursor-not-allowed opacity-50">
                                No actions available
                              </DropdownMenuItem>
                            )}
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

      {(bulkUpdateStatus.error || bulkDeleteLeads.error || bulkCreateLeadsCsv.error) && (
        <p className="text-sm text-red-400">Failed to apply bulk lead action.</p>
      )}

      <CsvImportDialog
        open={csvDialogOpen}
        onClose={() => setCsvDialogOpen(false)}
        isSubmitting={bulkCreateLeadsCsv.isPending}
        onImport={(rows) => {
          bulkCreateLeadsCsv.mutate(
            {
              payload: {
                campaign_id: campaignId,
                rows,
              },
            },
            {
              onSuccess: () => {
                setCsvDialogOpen(false);
              },
            }
          );
        }}
      />
    </div>
  );
}

function LeadsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="grid grid-cols-7 gap-3 py-2">
          <Skeleton className="h-5 w-5" />
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

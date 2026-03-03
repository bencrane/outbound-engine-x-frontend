"use client";

import { MoreHorizontal, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAddMultiChannelLeads,
  useCampaignLeads,
  usePauseCampaignLead,
  useResumeCampaignLead,
  useUnsubscribeCampaignLead,
} from "@/features/campaigns/api";

interface MultiChannelLeadsTabProps {
  campaignId: string;
}

interface NewLeadRow {
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  title: string;
  phone: string;
}

export function MultiChannelLeadsTab({ campaignId }: MultiChannelLeadsTabProps) {
  const canManage = usePermission("campaigns.manage");
  const { data: leads = [], isLoading, error } = useCampaignLeads(campaignId);
  const addLeads = useAddMultiChannelLeads();
  const pauseLead = usePauseCampaignLead();
  const resumeLead = useResumeCampaignLead();
  const unsubscribeLead = useUnsubscribeCampaignLead();

  const [query, setQuery] = useState("");
  const [newLeads, setNewLeads] = useState<NewLeadRow[]>([emptyLeadRow()]);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
        const haystack = `${name} ${lead.email ?? ""} ${lead.company_name ?? ""}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      }),
    [leads, query]
  );

  const submitLeads = () => {
    const payload = newLeads
      .map((lead) => ({
        email: lead.email.trim(),
        first_name: lead.first_name.trim() || undefined,
        last_name: lead.last_name.trim() || undefined,
        company: lead.company.trim() || undefined,
        title: lead.title.trim() || undefined,
        phone: lead.phone.trim() || undefined,
      }))
      .filter((lead) => lead.email);

    if (payload.length === 0) {
      setFormMessage("Add at least one lead email.");
      return;
    }

    const hasInvalidEmail = payload.some((lead) => !lead.email.includes("@"));
    if (hasInvalidEmail) {
      setFormMessage("Each lead must have a valid email.");
      return;
    }

    setFormMessage(null);
    addLeads.mutate(
      { campaignId, leads: payload },
      {
        onSuccess: (response) => {
          setNewLeads([emptyLeadRow()]);
          setFormMessage(`Added ${response.affected} lead${response.affected === 1 ? "" : "s"}.`);
        },
        onError: () => {
          setFormMessage("Failed to add leads.");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="text-sm font-medium text-zinc-100">Add Leads</h3>
          {newLeads.map((lead, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-7">
              <Input
                placeholder="Email *"
                value={lead.email}
                onChange={(event) =>
                  setNewLeads((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, email: event.target.value } : row
                    )
                  )
                }
              />
              <Input
                placeholder="First name"
                value={lead.first_name}
                onChange={(event) =>
                  setNewLeads((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, first_name: event.target.value } : row
                    )
                  )
                }
              />
              <Input
                placeholder="Last name"
                value={lead.last_name}
                onChange={(event) =>
                  setNewLeads((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, last_name: event.target.value } : row
                    )
                  )
                }
              />
              <Input
                placeholder="Company"
                value={lead.company}
                onChange={(event) =>
                  setNewLeads((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, company: event.target.value } : row
                    )
                  )
                }
              />
              <Input
                placeholder="Title"
                value={lead.title}
                onChange={(event) =>
                  setNewLeads((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, title: event.target.value } : row
                    )
                  )
                }
              />
              <Input
                placeholder="Phone"
                value={lead.phone}
                onChange={(event) =>
                  setNewLeads((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, phone: event.target.value } : row
                    )
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={newLeads.length === 1}
                onClick={() =>
                  setNewLeads((current) => current.filter((_, rowIndex) => rowIndex !== index))
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNewLeads((current) => [...current, emptyLeadRow()])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add row
            </Button>
            <Button size="sm" onClick={submitLeads} disabled={addLeads.isPending}>
              {addLeads.isPending ? "Adding..." : "Add Leads"}
            </Button>
          </div>
          {formMessage && (
            <p className={`text-sm ${formMessage.includes("Failed") ? "text-red-400" : "text-zinc-300"}`}>
              {formMessage}
            </p>
          )}
          {addLeads.error && !formMessage && (
            <p className="text-sm text-red-400">Failed to add leads.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Leads</Label>
        <Input
          placeholder="Search leads by name, email, or company..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-red-400">Failed to load leads.</p>
      ) : isLoading ? (
        <p className="text-sm text-zinc-400">Loading leads...</p>
      ) : filteredLeads.length === 0 ? (
        <p className="text-sm text-zinc-400">No leads found.</p>
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
                    <TableCell>{lead.email ?? "-"}</TableCell>
                    <TableCell>{lead.company_name ?? "-"}</TableCell>
                    <TableCell>{lead.title ?? "-"}</TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {["active", "contacted", "connected", "replied"].includes(lead.status) && (
                              <DropdownMenuItem
                                onClick={() => pauseLead.mutate({ campaignId, leadId: lead.id })}
                              >
                                Pause
                              </DropdownMenuItem>
                            )}
                            {lead.status === "paused" && (
                              <DropdownMenuItem
                                onClick={() => resumeLead.mutate({ campaignId, leadId: lead.id })}
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
                                  unsubscribeLead.mutate({ campaignId, leadId: lead.id })
                                }
                              >
                                Unsubscribe
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
    </div>
  );
}

function emptyLeadRow(): NewLeadRow {
  return {
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    title: "",
    phone: "",
  };
}

"use client";

import { MoreHorizontal, Plus, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { LeadStatusBadge } from "@/components/shared/lead-status-badge";
import { Badge } from "@/components/ui/badge";
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
  useMultiChannelSequence,
  usePauseCampaignLead,
  useResumeCampaignLead,
  useUnsubscribeCampaignLead,
} from "@/features/campaigns/api";
import { LeadContentEditor } from "@/features/campaigns/components/lead-content-editor";
import {
  extractTemplateContent,
  hasStepOverrideValues,
  normalizeOverrideForStep,
  type StepOverrideDraft,
  StepContentForm,
} from "@/features/campaigns/components/step-content-form";

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
  includePersonalizedContent: boolean;
  overridesByStepOrder: Record<number, StepOverrideDraft>;
}

export function MultiChannelLeadsTab({ campaignId }: MultiChannelLeadsTabProps) {
  const canManage = usePermission("campaigns.manage");
  const { data: leads = [], isLoading, error } = useCampaignLeads(campaignId);
  const { data: sequence = [] } = useMultiChannelSequence(campaignId);
  const addLeads = useAddMultiChannelLeads();
  const pauseLead = usePauseCampaignLead();
  const resumeLead = useResumeCampaignLead();
  const unsubscribeLead = useUnsubscribeCampaignLead();

  const [query, setQuery] = useState("");
  const [newLeads, setNewLeads] = useState<NewLeadRow[]>([emptyLeadRow()]);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string>("");
  const [personalizationByLeadId, setPersonalizationByLeadId] = useState<
    Record<string, boolean | undefined>
  >({});

  const sortedSteps = useMemo(
    () => sequence.slice().sort((a, b) => a.step_order - b.step_order),
    [sequence]
  );

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
        step_content:
          lead.includePersonalizedContent && sortedSteps.length > 0
            ? sortedSteps
                .map((step) => {
                  const draft = lead.overridesByStepOrder[step.step_order] ?? {};
                  if (!hasStepOverrideValues(draft)) {
                    return null;
                  }
                  return {
                    step_order: step.step_order,
                    action_config_override: normalizeOverrideForStep(step, draft),
                  };
                })
                .filter(
                  (
                    stepContent
                  ): stepContent is {
                    step_order: number;
                    action_config_override: Record<string, unknown>;
                  } => Boolean(stepContent)
                )
            : undefined,
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
            <div key={index} className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="grid gap-2 md:grid-cols-7">
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

              {sortedSteps.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setNewLeads((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? {
                                ...row,
                                includePersonalizedContent: !row.includePersonalizedContent,
                              }
                            : row
                        )
                      )
                    }
                  >
                    {lead.includePersonalizedContent ? "Hide" : "Include"} personalized content
                  </Button>

                  {lead.includePersonalizedContent && (
                    <div className="space-y-3">
                      {sortedSteps.map((step) => {
                        const value = lead.overridesByStepOrder[step.step_order] ?? {};
                        return (
                          <StepContentForm
                            key={`${index}-${step.step_order}`}
                            step={step}
                            value={value}
                            template={extractTemplateContent(step)}
                            hasOverride={hasStepOverrideValues(value)}
                            onChange={(nextValue) =>
                              setNewLeads((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? {
                                        ...row,
                                        overridesByStepOrder: {
                                          ...row.overridesByStepOrder,
                                          [step.step_order]: nextValue,
                                        },
                                      }
                                    : row
                                )
                              )
                            }
                            onReset={() =>
                              setNewLeads((current) =>
                                current.map((row, rowIndex) => {
                                  if (rowIndex !== index) {
                                    return row;
                                  }
                                  const nextOverrides = { ...row.overridesByStepOrder };
                                  delete nextOverrides[step.step_order];
                                  return {
                                    ...row,
                                    overridesByStepOrder: nextOverrides,
                                  };
                                })
                              )
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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
                <TableHead>Personalized</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => {
                const fullName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
                const isExpanded = expandedLeadId === lead.id;
                const personalizedState = personalizationByLeadId[lead.id];
                return (
                  <Fragment key={lead.id}>
                    <TableRow>
                      <TableCell>{fullName || lead.email || "Unknown"}</TableCell>
                      <TableCell>{lead.email ?? "-"}</TableCell>
                      <TableCell>{lead.company_name ?? "-"}</TableCell>
                      <TableCell>{lead.title ?? "-"}</TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell>
                        {personalizedState === undefined ? (
                          <span className="text-zinc-500">-</span>
                        ) : personalizedState ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
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
                              <DropdownMenuItem
                                onClick={() =>
                                  setExpandedLeadId((current) =>
                                    current === lead.id ? "" : lead.id
                                  )
                                }
                              >
                                Personalize
                              </DropdownMenuItem>
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
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-zinc-900/50">
                          <LeadContentEditor
                            campaignId={campaignId}
                            lead={{
                              id: lead.id,
                              email: lead.email,
                              first_name: lead.first_name,
                              last_name: lead.last_name,
                            }}
                            onClose={() => setExpandedLeadId("")}
                            onOverrideStatusChange={(leadId, hasOverride) =>
                              setPersonalizationByLeadId((current) => ({
                                ...current,
                                [leadId]: hasOverride,
                              }))
                            }
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
    includePersonalizedContent: false,
    overridesByStepOrder: {},
  };
}

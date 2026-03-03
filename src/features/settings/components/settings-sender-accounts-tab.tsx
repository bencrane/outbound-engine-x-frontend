"use client";

import { MoreHorizontal } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBulkMxHealthcheck,
  useBulkUpdateInboxSignatures,
  useDeleteInboxSenderEmail,
  useDisableInboxWarmup,
  useEnableInboxWarmup,
  useInboxes,
  useInboxMxHealthcheck,
  useUpdateInboxWarmupDailyLimits,
} from "@/features/settings/api";
import { InboxBulkActions } from "@/features/settings/components/inbox-bulk-actions";
import { InboxDetailPanel } from "@/features/settings/components/inbox-detail-panel";
import { WorkspaceSettingsCard } from "@/features/settings/components/workspace-settings-card";
import { formatRelativeTime } from "@/lib/format";

export function SettingsSenderAccountsTab() {
  const canManage = usePermission("inboxes.manage");
  const { data: inboxes = [], isLoading, error } = useInboxes();
  const enableWarmup = useEnableInboxWarmup();
  const disableWarmup = useDisableInboxWarmup();
  const updateWarmupDailyLimits = useUpdateInboxWarmupDailyLimits();
  const deleteSenderEmail = useDeleteInboxSenderEmail();
  const runMxCheck = useInboxMxHealthcheck();
  const runBulkMxCheck = useBulkMxHealthcheck();
  const bulkUpdateSignatures = useBulkUpdateInboxSignatures();

  const [selectedInboxIds, setSelectedInboxIds] = useState<string[]>([]);
  const [expandedInboxId, setExpandedInboxId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState("");
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState("");

  const allSelected = inboxes.length > 0 && selectedInboxIds.length === inboxes.length;
  const someSelected = selectedInboxIds.length > 0 && !allSelected;
  const actionPending =
    enableWarmup.isPending ||
    disableWarmup.isPending ||
    updateWarmupDailyLimits.isPending ||
    bulkUpdateSignatures.isPending ||
    deleteSenderEmail.isPending ||
    runMxCheck.isPending ||
    runBulkMxCheck.isPending;

  const selectedCount = selectedInboxIds.length;
  const selectedSet = useMemo(() => new Set(selectedInboxIds), [selectedInboxIds]);

  if (error) {
    return <p className="text-sm text-red-400">Failed to load sender accounts.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (inboxes.length === 0) {
    return (
      <div className="space-y-4">
        <WorkspaceSettingsCard canManage={canManage} />
        <p className="text-sm text-zinc-400">No sender accounts found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WorkspaceSettingsCard canManage={canManage} />

      {canManage && (
        <InboxBulkActions
          selectedCount={selectedCount}
          disabled={actionPending}
          onEnableWarmup={() => {
            if (selectedCount === 0) return;
            setActionSuccess("");
            enableWarmup.mutate(
              { inbox_ids: selectedInboxIds },
              {
                onSuccess: () => setActionSuccess("Warmup enabled for selected inboxes."),
              }
            );
          }}
          onDisableWarmup={() => {
            if (selectedCount === 0) return;
            setActionSuccess("");
            disableWarmup.mutate(
              { inbox_ids: selectedInboxIds },
              {
                onSuccess: () => setActionSuccess("Warmup disabled for selected inboxes."),
              }
            );
          }}
          onSetDailyLimits={(dailyLimit) => {
            if (selectedCount === 0) return;
            setActionSuccess("");
            updateWarmupDailyLimits.mutate(
              { inbox_ids: selectedInboxIds, daily_limit: dailyLimit },
              {
                onSuccess: () => setActionSuccess("Warmup daily limits updated."),
              }
            );
          }}
        />
      )}

      {canManage && selectedCount > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={actionPending}
              onClick={() => setShowSignatureEditor((current) => !current)}
            >
              Update Signatures
            </Button>
          </div>
          {showSignatureEditor && (
            <div className="mt-3 space-y-2">
              <Textarea
                rows={4}
                placeholder="New email signature for selected inboxes..."
                value={signatureDraft}
                onChange={(event) => setSignatureDraft(event.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={actionPending || !signatureDraft.trim()}
                  onClick={() => {
                    setActionSuccess("");
                    bulkUpdateSignatures.mutate(
                      {
                        inbox_ids: selectedInboxIds,
                        email_signature: signatureDraft.trim(),
                      },
                      {
                        onSuccess: () => {
                          setActionSuccess("Signatures updated for selected inboxes.");
                          setShowSignatureEditor(false);
                          setSignatureDraft("");
                        },
                      }
                    );
                  }}
                >
                  Submit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={actionPending}
                  onClick={() => {
                    setShowSignatureEditor(false);
                    setSignatureDraft("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                {canManage && (
                  <Checkbox
                    checked={allSelected}
                    aria-checked={someSelected ? "mixed" : allSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedInboxIds(inboxes.map((inbox) => inbox.id));
                        return;
                      }
                      setSelectedInboxIds([]);
                    }}
                  />
                )}
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Warmup</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inboxes.map((inbox) => {
              const selected = selectedSet.has(inbox.id);
              const expanded = expandedInboxId === inbox.id;
              return (
                <Fragment key={inbox.id}>
                  <TableRow className={selected ? "bg-zinc-800/50" : undefined}>
                    <TableCell>
                      {canManage && (
                        <Checkbox
                          checked={selected}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedInboxIds((current) =>
                                current.includes(inbox.id) ? current : [...current, inbox.id]
                              );
                              return;
                            }
                            setSelectedInboxIds((current) =>
                              current.filter((id) => id !== inbox.id)
                            );
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{inbox.email}</TableCell>
                    <TableCell>{inbox.display_name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={inbox.status === "active" ? "success" : "secondary"}>
                        {inbox.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inbox.warmup_enabled ? "success" : "outline"}>
                        {inbox.warmup_enabled ? "enabled" : "disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatRelativeTime(inbox.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Sender account actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() =>
                                setExpandedInboxId((current) =>
                                  current === inbox.id ? null : inbox.id
                                )
                              }
                            >
                              View Details
                            </DropdownMenuItem>
                            {inbox.warmup_enabled ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setActionSuccess("");
                                  disableWarmup.mutate(
                                    { inbox_ids: [inbox.id] },
                                    {
                                      onSuccess: () =>
                                        setActionSuccess(`Warmup disabled for ${inbox.email}.`),
                                    }
                                  );
                                }}
                              >
                                Disable Warmup
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setActionSuccess("");
                                  enableWarmup.mutate(
                                    { inbox_ids: [inbox.id] },
                                    {
                                      onSuccess: () =>
                                        setActionSuccess(`Warmup enabled for ${inbox.email}.`),
                                    }
                                  );
                                }}
                              >
                                Enable Warmup
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setActionSuccess("");
                                runMxCheck.mutate(
                                  { inboxId: inbox.id },
                                  {
                                    onSuccess: () =>
                                      setActionSuccess(`MX check completed for ${inbox.email}.`),
                                  }
                                );
                                setExpandedInboxId(inbox.id);
                              }}
                            >
                              Run MX Check
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-300 hover:text-red-200"
                              onClick={() => {
                                if (!window.confirm(`Delete sender email for ${inbox.email}?`)) {
                                  return;
                                }
                                setActionSuccess("");
                                deleteSenderEmail.mutate(
                                  { inboxId: inbox.id },
                                  {
                                    onSuccess: () =>
                                      setActionSuccess(
                                        `Sender email deleted for ${inbox.email}.`
                                      ),
                                  }
                                );
                              }}
                            >
                              Delete Sender Email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow className="border-t-0">
                      <TableCell colSpan={7} className="bg-zinc-900/50">
                        <InboxDetailPanel
                          inboxId={inbox.id}
                          inboxEmail={inbox.email}
                          canManage={canManage}
                          onClose={() => setExpandedInboxId(null)}
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

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={runBulkMxCheck.isPending}
            onClick={() => {
              setActionSuccess("");
              runBulkMxCheck.mutate(undefined, {
                onSuccess: () => {
                  setActionSuccess("Bulk MX check triggered for inboxes missing MX records.");
                },
              });
            }}
          >
            {runBulkMxCheck.isPending ? "Running..." : "Run Bulk MX Check (Missing)"}
          </Button>
        </div>
      )}

      {(enableWarmup.error ||
        disableWarmup.error ||
        updateWarmupDailyLimits.error ||
        bulkUpdateSignatures.error ||
        deleteSenderEmail.error ||
        runMxCheck.error ||
        runBulkMxCheck.error) && (
        <p className="text-sm text-red-400">Failed to apply inbox management update.</p>
      )}
      {actionSuccess && <p className="text-sm text-emerald-400">{actionSuccess}</p>}
    </div>
  );
}

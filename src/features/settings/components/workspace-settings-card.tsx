"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useMasterInboxSettings,
  useUpdateMasterInboxSettings,
  useWorkspaceAccount,
} from "@/features/settings/api";
import { formatNumber } from "@/lib/format";

interface WorkspaceSettingsCardProps {
  canManage: boolean;
}

type MasterSettingsDraft = {
  sync_all_emails: boolean;
  smart_warmup_filter: boolean;
  auto_interested_categorization: boolean;
};

export function WorkspaceSettingsCard({ canManage }: WorkspaceSettingsCardProps) {
  const { data: account, isLoading: accountLoading, error: accountError } = useWorkspaceAccount();
  const {
    data: masterSettings,
    isLoading: settingsLoading,
    error: settingsError,
  } = useMasterInboxSettings();
  const updateMasterSettings = useUpdateMasterInboxSettings();
  const [draft, setDraft] = useState<MasterSettingsDraft | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const resolvedSettings = useMemo<MasterSettingsDraft>(() => {
    const source = isRecord(masterSettings) ? masterSettings : {};
    return (
      draft ?? {
        sync_all_emails: readBoolean(source, "sync_all_emails"),
        smart_warmup_filter: readBoolean(source, "smart_warmup_filter"),
        auto_interested_categorization: readBoolean(source, "auto_interested_categorization"),
      }
    );
  }, [draft, masterSettings]);

  const accountEntries = useMemo(() => toDisplayEntries(account), [account]);

  if (accountError || settingsError) {
    return <p className="text-sm text-red-400">Failed to load workspace settings.</p>;
  }

  if (accountLoading || settingsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-200">Account</p>
          {accountEntries.length === 0 ? (
            <p className="text-sm text-zinc-400">No workspace account info found.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {accountEntries.map(([key, value]) => (
                <div key={key} className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-400">{humanizeKey(key)}</p>
                  <p className="mt-1 text-sm text-zinc-100">{formatValue(value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-200">Master Inbox Settings</p>
          <SettingToggle
            label="Sync all emails"
            checked={resolvedSettings.sync_all_emails}
            onChange={(checked) =>
              setDraft((current) => ({
                ...(current ?? resolvedSettings),
                sync_all_emails: checked,
              }))
            }
            disabled={!canManage || updateMasterSettings.isPending}
          />
          <SettingToggle
            label="Smart warmup filter"
            checked={resolvedSettings.smart_warmup_filter}
            onChange={(checked) =>
              setDraft((current) => ({
                ...(current ?? resolvedSettings),
                smart_warmup_filter: checked,
              }))
            }
            disabled={!canManage || updateMasterSettings.isPending}
          />
          <SettingToggle
            label="Auto interested categorization"
            checked={resolvedSettings.auto_interested_categorization}
            onChange={(checked) =>
              setDraft((current) => ({
                ...(current ?? resolvedSettings),
                auto_interested_categorization: checked,
              }))
            }
            disabled={!canManage || updateMasterSettings.isPending}
          />
          <Button
            disabled={!canManage || updateMasterSettings.isPending}
            onClick={() => {
              setSuccessMessage("");
              updateMasterSettings.mutate(resolvedSettings, {
                onSuccess: () => {
                  setSuccessMessage("Master inbox settings updated.");
                  setDraft(null);
                },
              });
            }}
          >
            {updateMasterSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
          {updateMasterSettings.error && (
            <p className="text-sm text-red-400">Failed to update master inbox settings.</p>
          )}
          {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
      <Label>{label}</Label>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(value: Record<string, unknown>, key: string): boolean {
  return value[key] === true;
}

function toDisplayEntries(value: unknown): Array<[string, unknown]> {
  if (!isRecord(value)) return [];
  return Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined);
}

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

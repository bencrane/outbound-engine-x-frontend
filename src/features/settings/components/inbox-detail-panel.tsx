"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useInboxMxHealthcheck,
  useInboxSenderEmail,
  useInboxWarmup,
  useUpdateInboxSenderEmail,
} from "@/features/settings/api";
import { formatNumber } from "@/lib/format";

interface InboxDetailPanelProps {
  inboxId: string;
  inboxEmail: string;
  canManage: boolean;
  onClose: () => void;
}

export function InboxDetailPanel({ inboxId, inboxEmail, canManage, onClose }: InboxDetailPanelProps) {
  const { startDate, endDate } = useMemo(() => getLast30DaysRange(), []);
  const { data: senderDetail, isLoading: senderLoading, error: senderError } = useInboxSenderEmail(inboxId);
  const { data: warmupDetail, isLoading: warmupLoading, error: warmupError } = useInboxWarmup(
    inboxId,
    startDate,
    endDate
  );
  const updateSenderEmail = useUpdateInboxSenderEmail();
  const runMxHealthcheck = useInboxMxHealthcheck();

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [dailyLimitDraft, setDailyLimitDraft] = useState<string | null>(null);
  const [signatureDraft, setSignatureDraft] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const senderEmail = isRecord(senderDetail?.sender_email) ? senderDetail.sender_email : {};
  const senderName = nameDraft ?? readString(senderEmail, "name");
  const senderDailyLimit = dailyLimitDraft ?? readNumberAsString(senderEmail, "daily_limit");
  const senderSignature = signatureDraft ?? readString(senderEmail, "email_signature");

  const warmupEntries = toDisplayEntries(warmupDetail?.warmup);
  const healthcheckEntries = toDisplayEntries(runMxHealthcheck.data?.healthcheck);
  const healthcheckHealthy = isHealthcheckHealthy(runMxHealthcheck.data?.healthcheck);

  return (
    <div className="space-y-4 rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{inboxEmail}</p>
          <p className="text-xs text-zinc-400">Provider: {senderDetail?.provider ?? warmupDetail?.provider ?? "-"}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base">Sender Email Config</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {senderError ? (
            <p className="text-sm text-red-400">Failed to load sender email details.</p>
          ) : senderLoading ? (
            <SenderConfigSkeleton />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`sender-name-${inboxId}`}>Display Name</Label>
                  <Input
                    id={`sender-name-${inboxId}`}
                    value={senderName}
                    onChange={(event) => setNameDraft(event.target.value)}
                    disabled={!canManage || updateSenderEmail.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`sender-daily-limit-${inboxId}`}>Daily Limit</Label>
                  <Input
                    id={`sender-daily-limit-${inboxId}`}
                    type="number"
                    min={1}
                    value={senderDailyLimit}
                    onChange={(event) => setDailyLimitDraft(event.target.value)}
                    disabled={!canManage || updateSenderEmail.isPending}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`sender-signature-${inboxId}`}>Signature</Label>
                <Textarea
                  id={`sender-signature-${inboxId}`}
                  rows={3}
                  value={senderSignature}
                  onChange={(event) => setSignatureDraft(event.target.value)}
                  disabled={!canManage || updateSenderEmail.isPending}
                />
              </div>
              <Button
                size="sm"
                disabled={!canManage || updateSenderEmail.isPending}
                onClick={() => {
                  setSuccessMessage("");
                  updateSenderEmail.mutate(
                    {
                      inboxId,
                      body: {
                        name: senderName || undefined,
                        daily_limit: parseOptionalNumber(senderDailyLimit),
                        email_signature: senderSignature || undefined,
                      },
                    },
                    {
                      onSuccess: () => {
                        setSuccessMessage("Sender email updated.");
                        setNameDraft(null);
                        setDailyLimitDraft(null);
                        setSignatureDraft(null);
                      },
                    }
                  );
                }}
              >
                {updateSenderEmail.isPending ? "Saving..." : "Save Changes"}
              </Button>
              {updateSenderEmail.error && (
                <p className="text-sm text-red-400">Failed to update sender email.</p>
              )}
              {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base">Warmup Details</CardTitle>
        </CardHeader>
        <CardContent>
          {warmupError ? (
            <p className="text-sm text-red-400">Failed to load warmup details.</p>
          ) : warmupLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : warmupEntries.length === 0 ? (
            <p className="text-sm text-zinc-400">No warmup data for the selected date range.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {warmupEntries.map(([key, value]) => (
                <div key={key} className="rounded-md border border-zinc-800 bg-zinc-950 p-2">
                  <p className="text-xs text-zinc-500">{humanizeKey(key)}</p>
                  <p className="mt-1 text-sm text-zinc-100">{formatValue(value)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base">MX Healthcheck</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={runMxHealthcheck.isPending}
            onClick={() => runMxHealthcheck.mutate({ inboxId })}
          >
            {runMxHealthcheck.isPending ? "Checking..." : "Run MX Check"}
          </Button>

          {runMxHealthcheck.error && (
            <p className="text-sm text-red-400">Failed to run MX healthcheck.</p>
          )}

          {runMxHealthcheck.data && (
            <div className="space-y-2">
              <Badge variant={healthcheckHealthy ? "success" : "destructive"}>
                {healthcheckHealthy ? "Healthy" : "Issues Found"}
              </Badge>
              {healthcheckEntries.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {healthcheckEntries.map(([key, value]) => (
                    <div key={key} className="rounded-md border border-zinc-800 bg-zinc-950 p-2">
                      <p className="text-xs text-zinc-500">{humanizeKey(key)}</p>
                      <p className="mt-1 text-sm text-zinc-100">{formatValue(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">No MX details were returned.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SenderConfigSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

function getLast30DaysRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseOptionalNumber(value: string): number | undefined {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return num;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string): string {
  const item = value[key];
  return typeof item === "string" ? item : "";
}

function readNumberAsString(value: Record<string, unknown>, key: string): string {
  const item = value[key];
  if (typeof item === "number") return String(item);
  return "";
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
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ");
  if (isRecord(value)) return JSON.stringify(value);
  return String(value);
}

function isHealthcheckHealthy(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const booleanKeys = ["healthy", "is_healthy", "passed", "valid"];
  for (const key of booleanKeys) {
    if (typeof value[key] === "boolean") return value[key] === true;
  }
  const issues = value.issues;
  if (Array.isArray(issues)) return issues.length === 0;
  return true;
}

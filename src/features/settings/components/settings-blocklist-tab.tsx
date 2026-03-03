"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useBulkCreateBlocklistedDomains,
  useBulkCreateBlocklistedEmails,
  useBlocklistedDomains,
  useBlocklistedEmails,
  useCreateBlocklistedDomain,
  useCreateBlocklistedEmail,
  useDeleteBlocklistedDomain,
  useDeleteBlocklistedEmail,
} from "@/features/settings/api";

export function SettingsBlocklistTab() {
  const { data: rawEmails, isLoading: emailsLoading, error: emailsError } = useBlocklistedEmails();
  const { data: rawDomains, isLoading: domainsLoading, error: domainsError } =
    useBlocklistedDomains();
  const createEmail = useCreateBlocklistedEmail();
  const createDomain = useCreateBlocklistedDomain();
  const bulkCreateEmails = useBulkCreateBlocklistedEmails();
  const bulkCreateDomains = useBulkCreateBlocklistedDomains();
  const deleteEmail = useDeleteBlocklistedEmail();
  const deleteDomain = useDeleteBlocklistedDomain();

  const [emailInput, setEmailInput] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [showBulkEmailInput, setShowBulkEmailInput] = useState(false);
  const [showBulkDomainInput, setShowBulkDomainInput] = useState(false);
  const [bulkEmailInput, setBulkEmailInput] = useState("");
  const [bulkDomainInput, setBulkDomainInput] = useState("");

  const emails = useMemo(() => normalizeItems(rawEmails, "email"), [rawEmails]);
  const domains = useMemo(() => normalizeItems(rawDomains, "domain"), [rawDomains]);

  if (emailsError || domainsError) {
    return <p className="text-sm text-red-400">Failed to load blocklist.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Blocked Emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="blocked-email">Email</Label>
            <div className="flex gap-2">
              <Input
                id="blocked-email"
                type="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
              />
              <Button
                onClick={() => {
                  if (!emailInput.trim()) return;
                  createEmail.mutate(
                    { email: emailInput.trim() },
                    { onSuccess: () => setEmailInput("") }
                  );
                }}
                disabled={createEmail.isPending}
              >
                Add
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowBulkEmailInput((current) => !current)}
              >
                Bulk Add
              </Button>
            </div>
            {showBulkEmailInput && (
              <div className="space-y-2">
                <Textarea
                  rows={4}
                  placeholder="One email per line"
                  value={bulkEmailInput}
                  onChange={(event) => setBulkEmailInput(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const emails = parseMultilineValues(bulkEmailInput);
                      if (emails.length === 0) return;
                      bulkCreateEmails.mutate(
                        { emails },
                        {
                          onSuccess: () => {
                            setBulkEmailInput("");
                            setShowBulkEmailInput(false);
                          },
                        }
                      );
                    }}
                    disabled={bulkCreateEmails.isPending}
                  >
                    {bulkCreateEmails.isPending ? "Adding..." : "Submit Bulk Emails"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setShowBulkEmailInput(false);
                      setBulkEmailInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {emailsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} className="h-8 w-full" />
              ))}
            </div>
          ) : emails.length === 0 ? (
            <p className="text-sm text-zinc-400">No blocked emails.</p>
          ) : (
            <ul className="space-y-2">
              {emails.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200">{item.value}</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm("Remove blocked email?")) {
                        deleteEmail.mutate(item.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blocked Domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="blocked-domain">Domain</Label>
            <div className="flex gap-2">
              <Input
                id="blocked-domain"
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
              />
              <Button
                onClick={() => {
                  if (!domainInput.trim()) return;
                  createDomain.mutate(
                    { domain: domainInput.trim() },
                    { onSuccess: () => setDomainInput("") }
                  );
                }}
                disabled={createDomain.isPending}
              >
                Add
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowBulkDomainInput((current) => !current)}
              >
                Bulk Add
              </Button>
            </div>
            {showBulkDomainInput && (
              <div className="space-y-2">
                <Textarea
                  rows={4}
                  placeholder="One domain per line"
                  value={bulkDomainInput}
                  onChange={(event) => setBulkDomainInput(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const domains = parseMultilineValues(bulkDomainInput);
                      if (domains.length === 0) return;
                      bulkCreateDomains.mutate(
                        { domains },
                        {
                          onSuccess: () => {
                            setBulkDomainInput("");
                            setShowBulkDomainInput(false);
                          },
                        }
                      );
                    }}
                    disabled={bulkCreateDomains.isPending}
                  >
                    {bulkCreateDomains.isPending ? "Adding..." : "Submit Bulk Domains"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setShowBulkDomainInput(false);
                      setBulkDomainInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {domainsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} className="h-8 w-full" />
              ))}
            </div>
          ) : domains.length === 0 ? (
            <p className="text-sm text-zinc-400">No blocked domains.</p>
          ) : (
            <ul className="space-y-2">
              {domains.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200">{item.value}</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm("Remove blocked domain?")) {
                        deleteDomain.mutate(item.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ItemShape {
  id: string;
  value: string;
}

function normalizeItems(source: unknown, valueKey: "email" | "domain"): ItemShape[] {
  const list = Array.isArray(source)
    ? source
    : source && typeof source === "object" && Array.isArray((source as { items?: unknown }).items)
      ? (source as { items: unknown[] }).items
      : [];

  return list
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id =
        typeof record.id === "string"
          ? record.id
          : typeof record[`${valueKey}_id`] === "string"
            ? (record[`${valueKey}_id`] as string)
            : "";
      const value = typeof record[valueKey] === "string" ? (record[valueKey] as string) : "";
      if (!id || !value) return null;
      return { id, value };
    })
    .filter((entry): entry is ItemShape => Boolean(entry));
}

function parseMultilineValues(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

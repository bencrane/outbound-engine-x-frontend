"use client";

import { Fragment, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
  useCreateWebhook,
  useDeleteWebhook,
  useGetWebhook,
  useSendTestWebhookEvent,
  useUpdateWebhook,
  useWebhookEventTypes,
  useWebhookSamplePayload,
  useWebhooks,
} from "@/features/settings/api";
import { formatDate } from "@/lib/format";

export function SettingsWebhooksTab() {
  const { data: rawWebhooks = [], isLoading, error } = useWebhooks();
  const { data: rawEventTypes } = useWebhookEventTypes();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const webhooks = useMemo(
    () => (Array.isArray(rawWebhooks) ? rawWebhooks : []),
    [rawWebhooks]
  );
  const eventTypes = useMemo(() => normalizeEventTypes(rawEventTypes), [rawEventTypes]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const submitting = createWebhook.isPending || updateWebhook.isPending;

  if (error) {
    return <p className="text-sm text-red-400">Failed to load webhooks.</p>;
  }

  return (
    <div className="space-y-6">
      <form
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSuccessMessage("");
          const payload = { name, url, events: selectedEvents };
          if (editingId) {
            updateWebhook.mutate(
              { webhookId: editingId, body: payload },
              {
                onSuccess: () => {
                  setSuccessMessage("Webhook updated successfully.");
                  setEditingId(null);
                  setName("");
                  setUrl("");
                  setSelectedEvents([]);
                },
              }
            );
            return;
          }
          createWebhook.mutate(payload, {
            onSuccess: () => {
              setSuccessMessage("Webhook created successfully.");
              setName("");
              setUrl("");
              setSelectedEvents([]);
            },
          });
        }}
      >
        <h3 className="text-sm font-semibold text-white">
          {editingId ? "Edit Webhook" : "Create Webhook"}
        </h3>
        <div className="space-y-2">
          <Label htmlFor="webhook-name">Name</Label>
          <Input
            id="webhook-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="max-w-md"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhook-url">URL</Label>
          <Input
            id="webhook-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            className="max-w-md"
          />
        </div>
        <div className="space-y-2">
          <Label>Events</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {eventTypes.map((eventType) => (
              <label key={eventType} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(eventType)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedEvents((previous) => [...previous, eventType]);
                    } else {
                      setSelectedEvents((previous) =>
                        previous.filter((value) => value !== eventType)
                      );
                    }
                  }}
                />
                {eventType}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editingId ? "Update Webhook" : "Create Webhook"}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setName("");
                setUrl("");
                setSelectedEvents([]);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
        {(createWebhook.error || updateWebhook.error) && (
          <p className="text-sm text-red-400">Failed to save webhook.</p>
        )}
        {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-8 w-full" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <p className="text-sm text-zinc-400">No webhooks configured.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => {
                const id = readString(webhook, "id");
                const webhookName = readString(webhook, "name") || "-";
                const webhookUrl = readString(webhook, "url") || "-";
                const events = readStringArray(webhook, "events");
                const createdAt = readString(webhook, "created_at");

                return (
                  <Fragment key={id || webhookName}>
                    <TableRow>
                      <TableCell>{webhookName}</TableCell>
                      <TableCell>{webhookUrl}</TableCell>
                      <TableCell className="text-zinc-300">
                        {events.length > 0 ? events.join(", ") : "-"}
                      </TableCell>
                      <TableCell>{createdAt ? formatDate(createdAt) : "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="secondary">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              disabled={!id}
                              onClick={() => setExpandedWebhookId((current) => (current === id ? null : id))}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!id}
                              onClick={() => {
                                setEditingId(id);
                                setName(webhookName);
                                setUrl(webhookUrl);
                                setSelectedEvents(events);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-300 hover:text-red-200"
                              disabled={!id || deleteWebhook.isPending}
                              onClick={() => {
                                if (!id) return;
                                if (window.confirm("Delete this webhook?")) {
                                  deleteWebhook.mutate(id);
                                }
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {id && expandedWebhookId === id && (
                      <TableRow className="border-t-0">
                        <TableCell colSpan={5} className="bg-zinc-900/50">
                          <WebhookDetailPanel
                            webhookId={id}
                            initialUrl={webhookUrl}
                            eventTypes={eventTypes}
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

      {deleteWebhook.error && (
        <p className="text-sm text-red-400">Failed to delete webhook.</p>
      )}
    </div>
  );
}

function WebhookDetailPanel({
  webhookId,
  initialUrl,
  eventTypes,
}: {
  webhookId: string;
  initialUrl: string;
  eventTypes: string[];
}) {
  const { data, isLoading, error } = useGetWebhook(webhookId);
  const samplePayload = useWebhookSamplePayload();
  const sendTestEvent = useSendTestWebhookEvent();

  const [eventType, setEventType] = useState(eventTypes[0] ?? "");
  const [testUrl, setTestUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4 rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <h4 className="text-sm font-semibold text-white">Webhook Detail</h4>
      {error ? (
        <p className="text-sm text-red-400">Failed to load webhook detail.</p>
      ) : isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <pre className="max-h-96 overflow-auto rounded-md bg-zinc-800 p-4 text-xs font-mono text-zinc-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Event Type</Label>
          <Select value={eventType} onChange={(event) => setEventType(event.target.value)}>
            <option value="">Select event type</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!eventType || samplePayload.isPending}
            onClick={() => samplePayload.mutate({ event_type: eventType })}
          >
            {samplePayload.isPending ? "Loading..." : "View Sample Payload"}
          </Button>
          {samplePayload.error && (
            <p className="text-sm text-red-400">Failed to fetch sample payload.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Test URL</Label>
          <Input value={testUrl} onChange={(event) => setTestUrl(event.target.value)} />
          <Button
            size="sm"
            disabled={!eventType || !testUrl.trim() || sendTestEvent.isPending}
            onClick={() =>
              sendTestEvent.mutate({
                event_type: eventType,
                url: testUrl.trim(),
              })
            }
          >
            {sendTestEvent.isPending ? "Sending..." : "Send Test Event"}
          </Button>
          {sendTestEvent.error && (
            <p className="text-sm text-red-400">Failed to send test event.</p>
          )}
          {Boolean(sendTestEvent.data) && (
            <p className="text-sm text-emerald-400">Test event sent successfully.</p>
          )}
        </div>
      </div>

      {Boolean(samplePayload.data) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(JSON.stringify(samplePayload.data, null, 2));
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy JSON"}
            </Button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-md bg-zinc-800 p-4 text-xs font-mono text-zinc-300">
            {JSON.stringify(samplePayload.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeEventTypes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: unknown[] }).items.filter(
      (item): item is string => typeof item === "string"
    );
  }
  return [];
}

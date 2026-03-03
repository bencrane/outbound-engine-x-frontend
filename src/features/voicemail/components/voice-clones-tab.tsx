"use client";

import { useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateVoiceClone,
  useDeleteVoiceClone,
  usePreviewVoiceClone,
  useVoiceClones,
} from "@/features/voicemail/api";
import { formatDate } from "@/lib/format";

export function VoiceClonesTab() {
  const canManage = usePermission("voicedrop.manage");
  const { data: clones = [], isLoading, error } = useVoiceClones();
  const createVoiceClone = useCreateVoiceClone();
  const deleteVoiceClone = useDeleteVoiceClone();
  const previewVoiceClone = usePreviewVoiceClone();

  const [displayName, setDisplayName] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [previewCloneId, setPreviewCloneId] = useState("");
  const [previewScript, setPreviewScript] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<unknown>(null);

  const rows = useMemo(() => clones.slice(), [clones]);

  if (!canManage) {
    return (
      <p className="text-sm text-zinc-400">
        You do not have permission to manage voice clones.
      </p>
    );
  }

  const handleCreate = () => {
    setFeedback(null);
    if (!displayName.trim() || !recordingUrl.trim()) {
      setFeedback("Display name and recording URL are required.");
      return;
    }
    createVoiceClone.mutate(
      {
        display_name: displayName.trim(),
        recording_url: recordingUrl.trim(),
      },
      {
        onSuccess: () => {
          setDisplayName("");
          setRecordingUrl("");
          setFeedback("Voice clone creation requested.");
        },
        onError: (mutationError) => {
          setFeedback(mutationError.message || "Failed to create voice clone.");
        },
      }
    );
  };

  const handlePreview = () => {
    setFeedback(null);
    setPreviewResult(null);
    if (!previewCloneId || !previewScript.trim()) {
      setFeedback("Select a voice clone and enter a test script.");
      return;
    }

    previewVoiceClone.mutate(
      {
        voiceCloneId: previewCloneId,
        script: previewScript.trim(),
      },
      {
        onSuccess: (result) => {
          setPreviewResult(result);
        },
        onError: (mutationError) => {
          setFeedback(mutationError.message || "Failed to generate preview.");
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
        <h3 className="text-lg font-medium text-white">Create Clone</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Alice - Sales Voice"
            />
          </div>
          <div className="space-y-2">
            <Label>Recording URL</Label>
            <Input
              value={recordingUrl}
              onChange={(event) => setRecordingUrl(event.target.value)}
              placeholder="https://example.com/voice-sample.mp3"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={createVoiceClone.isPending}>
            {createVoiceClone.isPending ? "Creating..." : "Create Voice Clone"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400">Failed to load voice clones.</p>
      ) : isLoading ? (
        <p className="text-sm text-zinc-400">Loading voice clones...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-400">No voice clones yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((clone) => (
                <TableRow key={clone.id}>
                  <TableCell>{clone.display_name ?? clone.id}</TableCell>
                  <TableCell>{toStatusBadge(String(clone.status ?? "unknown"))}</TableCell>
                  <TableCell>
                    {clone.created_at ? formatDate(String(clone.created_at)) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPreviewCloneId(clone.id);
                          setPreviewScript("");
                          setPreviewResult(null);
                        }}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Delete voice clone "${clone.display_name ?? clone.id}"?`
                            )
                          ) {
                            return;
                          }
                          deleteVoiceClone.mutate(
                            { voiceCloneId: clone.id },
                            {
                              onError: (mutationError) => {
                                setFeedback(mutationError.message || "Failed to delete voice clone.");
                              },
                            }
                          );
                        }}
                        disabled={deleteVoiceClone.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {previewCloneId && (
        <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
          <h4 className="text-sm font-medium text-zinc-200">Preview Voice Clone</h4>
          <div className="space-y-2">
            <Label>Test Script</Label>
            <Textarea
              rows={4}
              value={previewScript}
              onChange={(event) => setPreviewScript(event.target.value)}
              placeholder="Hi there, this is a preview of our voicemail voice clone."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePreview} disabled={previewVoiceClone.isPending}>
              {previewVoiceClone.isPending ? "Generating..." : "Preview"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPreviewCloneId("");
                setPreviewScript("");
                setPreviewResult(null);
              }}
            >
              Cancel
            </Button>
          </div>
          {renderPreviewResult(previewResult)}
        </div>
      )}

      {feedback && (
        <p className={`text-sm ${feedback.includes("Failed") ? "text-red-400" : "text-zinc-300"}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}

function toStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "ready" || normalized === "verified" || normalized === "active") {
    return <Badge variant="success">{status}</Badge>;
  }
  if (normalized === "pending" || normalized === "processing") {
    return <Badge variant="warning">{status}</Badge>;
  }
  if (normalized === "failed" || normalized === "error") {
    return <Badge variant="destructive">{status}</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function renderPreviewResult(result: unknown) {
  if (!result) {
    return null;
  }

  const audioUrl = extractAudioUrl(result);
  if (audioUrl) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-zinc-300">Preview ready:</p>
        <audio controls src={audioUrl} className="w-full" />
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function extractAudioUrl(result: unknown): string | null {
  if (typeof result === "string" && result.startsWith("http")) {
    return result;
  }
  if (!result || typeof result !== "object") {
    return null;
  }
  const record = result as Record<string, unknown>;
  const keys = ["audio_url", "url", "preview_url", "download_url"];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.startsWith("http")) {
      return value;
    }
  }
  return null;
}

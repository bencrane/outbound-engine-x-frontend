"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useAttachTagsToCampaigns,
  useAttachTagsToInboxes,
  useAttachTagsToLeads,
  useCreateTag,
  useDeleteTag,
  useRemoveTagsFromCampaigns,
  useRemoveTagsFromInboxes,
  useRemoveTagsFromLeads,
  useTags,
} from "@/features/tags/api";

type TagTarget = "campaigns" | "leads" | "inboxes";

type TagOption = {
  id: number;
  name: string;
  isDefault: boolean;
};

export function SettingsTagsTab() {
  const { data: rawTags = [], isLoading, error } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const attachCampaigns = useAttachTagsToCampaigns();
  const removeCampaigns = useRemoveTagsFromCampaigns();
  const attachLeads = useAttachTagsToLeads();
  const removeLeads = useRemoveTagsFromLeads();
  const attachInboxes = useAttachTagsToInboxes();
  const removeInboxes = useRemoveTagsFromInboxes();

  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [target, setTarget] = useState<TagTarget>("campaigns");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [idsInput, setIdsInput] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const tags = useMemo(() => normalizeTags(rawTags), [rawTags]);
  const isApplying =
    attachCampaigns.isPending ||
    removeCampaigns.isPending ||
    attachLeads.isPending ||
    removeLeads.isPending ||
    attachInboxes.isPending ||
    removeInboxes.isPending;

  if (error) {
    return <p className="text-sm text-red-400">Failed to load tags.</p>;
  }

  return (
    <div className="space-y-6">
      <form
        className="max-w-3xl space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSuccessMessage("");
          createTag.mutate(
            { name: name.trim(), default: isDefault },
            {
              onSuccess: () => {
                setName("");
                setIsDefault(false);
                setSuccessMessage("Tag created.");
              },
            }
          );
        }}
      >
        <h3 className="text-sm font-semibold text-white">Create Tag</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <Checkbox checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
            Default
          </label>
          <Button type="submit" disabled={createTag.isPending || !name.trim()}>
            {createTag.isPending ? "Creating..." : "Create Tag"}
          </Button>
        </div>
        {createTag.error && <p className="text-sm text-red-400">Failed to create tag.</p>}
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-8 w-full" />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <p className="p-4 text-sm text-zinc-400">No tags found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag Name</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>{tag.name}</TableCell>
                  <TableCell>
                    <Badge variant={tag.isDefault ? "default" : "secondary"}>
                      {tag.isDefault ? "yes" : "no"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleteTag.isPending}
                      onClick={() => {
                        if (!window.confirm(`Delete tag "${tag.name}"?`)) return;
                        setSuccessMessage("");
                        deleteTag.mutate(
                          { tag_id: String(tag.id) },
                          {
                            onSuccess: () => setSuccessMessage("Tag deleted."),
                          }
                        );
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Apply Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Target</Label>
              <Select value={target} onChange={(event) => setTarget(event.target.value as TagTarget)}>
                <option value="campaigns">Campaigns</option>
                <option value="leads">Leads</option>
                <option value="inboxes">Inboxes</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select value={selectedTagId} onChange={(event) => setSelectedTagId(event.target.value)}>
                <option value="">Select tag</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={String(tag.id)}>
                    {tag.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {target === "leads" && (
            <div className="space-y-2">
              <Label htmlFor="tags-campaign-id">Campaign ID</Label>
              <Input
                id="tags-campaign-id"
                placeholder="Required for leads"
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tags-ids">IDs (comma-separated)</Label>
            <Textarea
              id="tags-ids"
              rows={2}
              placeholder={
                target === "campaigns"
                  ? "campaign-id-1,campaign-id-2"
                  : target === "leads"
                    ? "lead-id-1,lead-id-2"
                    : "inbox-id-1,inbox-id-2"
              }
              value={idsInput}
              onChange={(event) => setIdsInput(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              disabled={isApplying}
              onClick={() =>
                applyTagAction({
                  action: "attach",
                  target,
                  selectedTagId,
                  idsInput,
                  campaignId,
                  setSuccessMessage,
                  attachCampaigns: attachCampaigns.mutate,
                  removeCampaigns: removeCampaigns.mutate,
                  attachLeads: attachLeads.mutate,
                  removeLeads: removeLeads.mutate,
                  attachInboxes: attachInboxes.mutate,
                  removeInboxes: removeInboxes.mutate,
                })
              }
            >
              Attach
            </Button>
            <Button
              variant="destructive"
              disabled={isApplying}
              onClick={() =>
                applyTagAction({
                  action: "remove",
                  target,
                  selectedTagId,
                  idsInput,
                  campaignId,
                  setSuccessMessage,
                  attachCampaigns: attachCampaigns.mutate,
                  removeCampaigns: removeCampaigns.mutate,
                  attachLeads: attachLeads.mutate,
                  removeLeads: removeLeads.mutate,
                  attachInboxes: attachInboxes.mutate,
                  removeInboxes: removeInboxes.mutate,
                })
              }
            >
              Remove
            </Button>
          </div>
          {(attachCampaigns.error ||
            removeCampaigns.error ||
            attachLeads.error ||
            removeLeads.error ||
            attachInboxes.error ||
            removeInboxes.error ||
            deleteTag.error) && (
            <p className="text-sm text-red-400">Failed to apply tag action.</p>
          )}
        </CardContent>
      </Card>

      {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
    </div>
  );
}

function normalizeTags(input: Record<string, unknown>[]): TagOption[] {
  return input
    .map((tag) => {
      const rawId = tag.id;
      const id = typeof rawId === "number" ? rawId : Number(rawId);
      const name = typeof tag.name === "string" ? tag.name : "";
      const isDefault = tag.default === true;
      if (!Number.isFinite(id) || !name) return null;
      return { id, name, isDefault };
    })
    .filter((tag): tag is TagOption => tag !== null);
}

function parseIds(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function applyTagAction({
  action,
  target,
  selectedTagId,
  idsInput,
  campaignId,
  setSuccessMessage,
  attachCampaigns,
  removeCampaigns,
  attachLeads,
  removeLeads,
  attachInboxes,
  removeInboxes,
}: {
  action: "attach" | "remove";
  target: TagTarget;
  selectedTagId: string;
  idsInput: string;
  campaignId: string;
  setSuccessMessage: (value: string) => void;
  attachCampaigns: (payload: {
    tag_ids: number[];
    campaign_ids: string[];
    skip_webhooks?: boolean;
  }) => void;
  removeCampaigns: (payload: {
    tag_ids: number[];
    campaign_ids: string[];
    skip_webhooks?: boolean;
  }) => void;
  attachLeads: (payload: {
    tag_ids: number[];
    campaign_id: string;
    lead_ids: string[];
    skip_webhooks?: boolean;
  }) => void;
  removeLeads: (payload: {
    tag_ids: number[];
    campaign_id: string;
    lead_ids: string[];
    skip_webhooks?: boolean;
  }) => void;
  attachInboxes: (payload: {
    tag_ids: number[];
    inbox_ids: string[];
    skip_webhooks?: boolean;
  }) => void;
  removeInboxes: (payload: {
    tag_ids: number[];
    inbox_ids: string[];
    skip_webhooks?: boolean;
  }) => void;
}) {
  const tagId = Number(selectedTagId);
  const ids = parseIds(idsInput);
  if (!Number.isFinite(tagId) || ids.length === 0) return;

  if (target === "campaigns") {
    const payload = { tag_ids: [tagId], campaign_ids: ids };
    if (action === "attach") {
      attachCampaigns(payload);
      setSuccessMessage("Tags attached to campaigns.");
      return;
    }
    removeCampaigns(payload);
    setSuccessMessage("Tags removed from campaigns.");
    return;
  }

  if (target === "leads") {
    if (!campaignId.trim()) return;
    const payload = { tag_ids: [tagId], campaign_id: campaignId.trim(), lead_ids: ids };
    if (action === "attach") {
      attachLeads(payload);
      setSuccessMessage("Tags attached to leads.");
      return;
    }
    removeLeads(payload);
    setSuccessMessage("Tags removed from leads.");
    return;
  }

  const payload = { tag_ids: [tagId], inbox_ids: ids };
  if (action === "attach") {
    attachInboxes(payload);
    setSuccessMessage("Tags attached to inboxes.");
    return;
  }
  removeInboxes(payload);
  setSuccessMessage("Tags removed from inboxes.");
}

"use client";

import { Button } from "@/components/ui/button";

interface CampaignBulkActionsProps {
  selectedCount: number;
  disabled?: boolean;
  onDeleteSelected: () => void;
}

export function CampaignBulkActions({
  selectedCount,
  disabled = false,
  onDeleteSelected,
}: CampaignBulkActionsProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-sm text-zinc-300">{selectedCount} campaigns selected</p>
      <Button size="sm" variant="destructive" disabled={disabled} onClick={onDeleteSelected}>
        Delete Selected
      </Button>
    </div>
  );
}

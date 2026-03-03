"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface LeadBulkActionsProps {
  selectedCount: number;
  disabled?: boolean;
  statusValue: string;
  onStatusValueChange: (status: string) => void;
  onApplyStatus: () => void;
  onDeleteSelected: () => void;
}

const statusOptions = [
  "pending",
  "active",
  "paused",
  "contacted",
  "connected",
  "replied",
  "not_interested",
  "bounced",
  "unsubscribed",
];

export function LeadBulkActions({
  selectedCount,
  disabled = false,
  statusValue,
  onStatusValueChange,
  onApplyStatus,
  onDeleteSelected,
}: LeadBulkActionsProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-sm text-zinc-300">{selectedCount} leads selected</p>
      <div className="flex items-center gap-2">
        <Select
          className="w-44"
          value={statusValue}
          disabled={disabled}
          onChange={(event) => onStatusValueChange(event.target.value)}
        >
          <option value="">Change Status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || !statusValue}
          onClick={onApplyStatus}
        >
          Apply
        </Button>
      </div>
      <Button size="sm" variant="destructive" disabled={disabled} onClick={onDeleteSelected}>
        Delete Selected
      </Button>
    </div>
  );
}

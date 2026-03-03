"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InboxBulkActionsProps {
  selectedCount: number;
  disabled?: boolean;
  onEnableWarmup: () => void;
  onDisableWarmup: () => void;
  onSetDailyLimits: (dailyLimit: number) => void;
}

export function InboxBulkActions({
  selectedCount,
  disabled = false,
  onEnableWarmup,
  onDisableWarmup,
  onSetDailyLimits,
}: InboxBulkActionsProps) {
  const [showLimitForm, setShowLimitForm] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("50");

  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-sm text-zinc-300">{selectedCount} selected</p>
      <Button size="sm" disabled={disabled} onClick={onEnableWarmup}>
        Enable Warmup
      </Button>
      <Button size="sm" variant="secondary" disabled={disabled} onClick={onDisableWarmup}>
        Disable Warmup
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setShowLimitForm((current) => !current)}
      >
        Set Daily Limits
      </Button>
      {showLimitForm && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            className="h-8 w-28"
            value={dailyLimit}
            onChange={(event) => setDailyLimit(event.target.value)}
          />
          <Button
            size="sm"
            disabled={disabled || Number(dailyLimit) <= 0}
            onClick={() => {
              const numericLimit = Number(dailyLimit);
              if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
                return;
              }
              onSetDailyLimits(numericLimit);
              setShowLimitForm(false);
            }}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => setShowLimitForm(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DateRangePreset = "7d" | "30d" | "90d" | "all";

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  activePreset: DateRangePreset;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onPresetChange: (preset: DateRangePreset) => void;
}

export function DateRangeFilter({
  fromDate,
  toDate,
  activePreset,
  onFromDateChange,
  onToDateChange,
  onPresetChange,
}: DateRangeFilterProps) {
  return (
    <section className="mt-6 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <Input
          type="date"
          aria-label="From date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
        />
        <Input
          type="date"
          aria-label="To date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={activePreset === "7d" ? "default" : "secondary"}
          onClick={() => onPresetChange("7d")}
        >
          Last 7 days
        </Button>
        <Button
          size="sm"
          variant={activePreset === "30d" ? "default" : "secondary"}
          onClick={() => onPresetChange("30d")}
        >
          Last 30 days
        </Button>
        <Button
          size="sm"
          variant={activePreset === "90d" ? "default" : "secondary"}
          onClick={() => onPresetChange("90d")}
        >
          Last 90 days
        </Button>
        <Button
          size="sm"
          variant={activePreset === "all" ? "default" : "secondary"}
          onClick={() => onPresetChange("all")}
        >
          All time
        </Button>
      </div>
    </section>
  );
}

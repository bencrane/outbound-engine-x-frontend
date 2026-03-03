"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";

interface WorkspaceStatsSectionProps {
  workspaceStats: Record<string, unknown>;
  campaignEventsStats: Record<string, unknown>;
  isLoading: boolean;
  error: Error | null;
}

export function WorkspaceStatsSection({
  workspaceStats,
  campaignEventsStats,
  isLoading,
  error,
}: WorkspaceStatsSectionProps) {
  if (error) {
    return <p className="text-sm text-red-400">Failed to load workspace stats.</p>;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const statEntries = [
    ...toDisplayEntries(workspaceStats),
    ...toDisplayEntries(campaignEventsStats),
  ];

  if (statEntries.length === 0) {
    return <p className="text-sm text-zinc-400">No workspace activity data available.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {statEntries.map((entry) => (
        <Card key={entry.key}>
          <CardHeader className="pb-2">
            <CardDescription>{entry.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{entry.value}</CardTitle>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function toDisplayEntries(source: Record<string, unknown>) {
  return Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      value: formatValue(key, value),
    }));
}

function humanizeKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatValue(key: string, value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    if (key.includes("rate") || key.includes("percent")) {
      return formatPercent(value > 1 ? value / 100 : value);
    }
    return formatNumber(value);
  }
  if (typeof value === "string") {
    if (value.includes("T") && !Number.isNaN(new Date(value).getTime())) {
      return formatDateTime(value);
    }
    return value;
  }
  return String(value);
}

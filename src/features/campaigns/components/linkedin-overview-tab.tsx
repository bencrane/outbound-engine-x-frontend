"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLinkedinCampaignMetrics } from "@/features/campaigns/api";
import { formatDateTime, formatNumber } from "@/lib/format";

interface LinkedinOverviewTabProps {
  campaignId: string;
}

export function LinkedinOverviewTab({ campaignId }: LinkedinOverviewTabProps) {
  const { data, isLoading, error } = useLinkedinCampaignMetrics(campaignId);
  const [showRaw, setShowRaw] = useState(false);
  const metrics = data ? getNormalizedMetrics(data.normalized) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>LinkedIn Metrics</CardTitle>
        <CardDescription>HeyReach performance for this campaign</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-red-400">Failed to load LinkedIn metrics.</p>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-52" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full" />
              ))}
            </div>
          </div>
        ) : !data ? (
          <p className="text-sm text-zinc-400">No LinkedIn metrics available.</p>
        ) : (
          <>
            <p className="text-sm text-zinc-400">Last updated: {formatDateTime(data.fetched_at)}</p>
            {metrics.length === 0 ? (
              <p className="text-sm text-zinc-400">No normalized metrics to display.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {metrics.map(([key, value]) => (
                  <div key={key} className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-400">{humanizeKey(key)}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{formatNumber(value)}</p>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRaw((current) => !current)}
              >
                {showRaw ? "Hide raw data" : "Show raw data"}
              </Button>
              {showRaw && (
                <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-zinc-800 p-4 text-xs font-mono text-zinc-300">
                  {JSON.stringify(data.raw, null, 2)}
                </pre>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function getNormalizedMetrics(
  normalized: Record<string, number | null> | null | undefined
): Array<[string, number]> {
  if (!normalized) return [];
  return Object.entries(normalized).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number"
  );
}

function humanizeKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

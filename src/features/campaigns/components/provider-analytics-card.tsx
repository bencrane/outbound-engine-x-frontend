"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaignProviderAnalytics } from "@/features/campaigns/api";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";

interface ProviderAnalyticsCardProps {
  campaignId: string;
}

export function ProviderAnalyticsCard({ campaignId }: ProviderAnalyticsCardProps) {
  const { data, isLoading, error } = useCampaignProviderAnalytics(campaignId);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Metrics</CardTitle>
        <CardDescription>Provider-level campaign analytics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-red-400">Failed to load provider analytics.</p>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-20 w-full" />
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{humanizeProvider(data.provider)}</Badge>
              <p className="text-sm text-zinc-400">
                Last updated: {formatDateTime(data.fetched_at)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(data.normalized).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-md border border-zinc-800 bg-zinc-900 p-3"
                >
                  <p className="text-xs text-zinc-400">{humanizeKey(key)}</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatMetricValue(key, value)}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRaw((value) => !value)}
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
        ) : (
          <p className="text-sm text-zinc-400">No provider analytics available.</p>
        )}
      </CardContent>
    </Card>
  );
}

function humanizeProvider(value: string) {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetricValue(key: string, value: unknown) {
  if (typeof value === "number") {
    if (key.includes("rate") || key.includes("percent")) {
      return formatPercent(value > 1 ? value / 100 : value);
    }
    return formatNumber(value);
  }
  if (value === null || value === undefined) return "-";
  return String(value);
}

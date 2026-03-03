"use client";

import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangeFilter, type DateRangePreset } from "@/components/shared/date-range-filter";
import { useDirectMailAnalytics } from "@/features/direct-mail/api";
import { DailyTrendsTable } from "@/features/direct-mail/components/daily-trends-table";
import { DeliveryFunnel } from "@/features/direct-mail/components/delivery-funnel";
import { VolumePivotTable } from "@/features/direct-mail/components/volume-pivot-table";
import { useCompanyFilters } from "@/lib/company-context";
import { formatNumber } from "@/lib/format";

const TYPE_ORDER = ["postcard", "letter", "self_mailer", "check"] as const;
const TYPE_SET = new Set<string>(TYPE_ORDER);

export function DirectMailAnalyticsTab() {
  const companyFilters = useCompanyFilters();
  const initialRange = getPresetInputRange("7d");
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [activePreset, setActivePreset] = useState<DateRangePreset>("7d");

  const fromTs = fromDate ? `${fromDate}T00:00:00.000Z` : undefined;
  const toTs = toDate ? `${toDate}T23:59:59.999Z` : undefined;

  const analyticsFilters = useMemo(
    () => ({
      ...toDirectMailFilters(companyFilters),
      ...(fromTs ? { from_ts: fromTs } : {}),
      ...(toTs ? { to_ts: toTs } : {}),
    }),
    [companyFilters, fromTs, toTs]
  );

  const { data, isLoading, error } = useDirectMailAnalytics(analyticsFilters);
  const byType = aggregateByType(data?.volume_by_type_status ?? []);
  const failureRows = [...(data?.failure_reason_breakdown ?? [])].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <DateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        activePreset={activePreset}
        onFromDateChange={(value) => {
          setFromDate(value);
          setActivePreset("all");
        }}
        onToDateChange={(value) => {
          setToDate(value);
          setActivePreset("all");
        }}
        onPresetChange={(preset) => {
          setActivePreset(preset);
          if (preset === "all") {
            setFromDate("");
            setToDate("");
            return;
          }
          const range = getPresetInputRange(preset);
          setFromDate(range.fromDate);
          setToDate(range.toDate);
        }}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total Pieces" value={data?.total_pieces ?? 0} isLoading={isLoading} error={error} />
        <SummaryCard label="Postcards" value={byType.postcard} isLoading={isLoading} error={error} />
        <SummaryCard label="Letters" value={byType.letter} isLoading={isLoading} error={error} />
        <SummaryCard
          label="Self-Mailers"
          value={byType.self_mailer}
          isLoading={isLoading}
          error={error}
        />
        <SummaryCard label="Checks" value={byType.check} isLoading={isLoading} error={error} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Volume by Type &amp; Status</CardTitle>
          <CardDescription>Status matrix across direct mail piece types</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-red-400">Failed to load volume breakdown.</p>
          ) : isLoading ? (
            <SectionSkeleton rows={8} />
          ) : (data?.volume_by_type_status ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400">No volume data in this period.</p>
          ) : (
            <VolumePivotTable items={data?.volume_by_type_status ?? []} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Funnel</CardTitle>
            <CardDescription>Progression from created to delivered</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-red-400">Failed to load delivery funnel.</p>
            ) : isLoading ? (
              <SectionSkeleton rows={4} />
            ) : (data?.delivery_funnel ?? []).length === 0 ? (
              <p className="text-sm text-zinc-400">No funnel data in this period.</p>
            ) : (
              <DeliveryFunnel items={data?.delivery_funnel ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failure Reasons</CardTitle>
            <CardDescription>Most common reasons for failed pieces</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-red-400">Failed to load failure reasons.</p>
            ) : isLoading ? (
              <SectionSkeleton rows={5} />
            ) : failureRows.length === 0 ? (
              <p className="text-sm text-zinc-400">No failures in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failureRows.map((item) => (
                      <TableRow key={item.reason}>
                        <TableCell className="text-red-400">{item.reason}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Trends</CardTitle>
          <CardDescription>Created, processed, transit, delivery, and failures over time</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-red-400">Failed to load daily trends.</p>
          ) : isLoading ? (
            <SectionSkeleton rows={10} />
          ) : (data?.daily_trends ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400">No trend data in this period.</p>
          ) : (
            <DailyTrendsTable items={data?.daily_trends ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  isLoading,
  error,
}: {
  label: string;
  value: number;
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-red-400">Error</p>
        ) : isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-semibold text-white">{formatNumber(value)}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  );
}

function aggregateByType(items: { piece_type: string; count: number }[]) {
  const totals: Record<(typeof TYPE_ORDER)[number], number> = {
    postcard: 0,
    letter: 0,
    self_mailer: 0,
    check: 0,
  };
  for (const item of items) {
    if (!isPieceType(item.piece_type)) {
      continue;
    }
    totals[item.piece_type] += item.count;
  }
  return totals;
}

function getPresetInputRange(preset: Exclude<DateRangePreset, "all">) {
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const today = new Date();
  const fromValue = new Date(today);
  fromValue.setDate(today.getDate() - (days - 1));
  return {
    fromDate: toInputDate(fromValue),
    toDate: toInputDate(today),
  };
}

function isPieceType(value: string): value is (typeof TYPE_ORDER)[number] {
  return TYPE_SET.has(value);
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDirectMailFilters(filters: ReturnType<typeof useCompanyFilters>) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
    ...(filters.all_companies !== undefined ? { all_companies: filters.all_companies } : {}),
  };
}

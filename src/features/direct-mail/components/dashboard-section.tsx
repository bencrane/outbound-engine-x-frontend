"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDirectMailAnalytics } from "@/features/direct-mail/api";
import { useCompanyFilters } from "@/lib/company-context";
import { formatNumber } from "@/lib/format";

interface DirectMailDashboardSectionProps {
  from_ts?: string;
  to_ts?: string;
}

export function DirectMailDashboardSection({
  from_ts,
  to_ts,
}: DirectMailDashboardSectionProps) {
  const companyFilters = useCompanyFilters();
  const filters = {
    ...toDirectMailFilters(companyFilters),
    ...(from_ts ? { from_ts } : {}),
    ...(to_ts ? { to_ts } : {}),
  };

  const { data, isLoading, error } = useDirectMailAnalytics(filters);
  const volume = data?.volume_by_type_status ?? [];

  const delivered = sumStatuses(volume, ["delivered"]);
  const inTransit = sumStatuses(volume, ["in_transit"]);
  const failedReturned = sumStatuses(volume, ["failed", "returned"]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Direct Mail</CardTitle>
            <CardDescription>Volume and delivery status across mail pieces</CardDescription>
          </div>
          <Link
            href="/direct-mail"
            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
          >
            View Direct Mail <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-red-400">Failed to load direct mail analytics.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat label="Total Pieces" value={data?.total_pieces ?? 0} isLoading={isLoading} />
            <SummaryStat label="Delivered" value={delivered} isLoading={isLoading} />
            <SummaryStat label="In Transit" value={inTransit} isLoading={isLoading} />
            <SummaryStat label="Failed / Returned" value={failedReturned} isLoading={isLoading} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(value)}</p>
      )}
    </div>
  );
}

function sumStatuses(
  items: { status: string; count: number }[],
  statuses: string[]
) {
  const allow = new Set(statuses);
  return items.reduce(
    (total, item) => total + (allow.has(item.status) ? item.count : 0),
    0
  );
}

function toDirectMailFilters(filters: ReturnType<typeof useCompanyFilters>) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
    ...(filters.all_companies !== undefined ? { all_companies: filters.all_companies } : {}),
  };
}

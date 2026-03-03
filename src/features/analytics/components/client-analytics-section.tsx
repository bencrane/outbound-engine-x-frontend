"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { components } from "@/lib/api-types";
import { formatNumber, formatPercent, formatRelativeTime } from "@/lib/format";
import { useCompanies } from "@/lib/hooks";

type ClientAnalyticsItem = components["schemas"]["ClientAnalyticsRollupItem"];

interface ClientAnalyticsSectionProps {
  items: ClientAnalyticsItem[];
  isLoading: boolean;
  error: Error | null;
}

export function ClientAnalyticsSection({
  items,
  isLoading,
  error,
}: ClientAnalyticsSectionProps) {
  const { data: companies = [] } = useCompanies();
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));

  if (error) {
    return <p className="text-sm text-red-400">Failed to load client analytics.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">No client analytics available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead className="text-right">Campaigns</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Replies</TableHead>
            <TableHead className="text-right">Reply Rate</TableHead>
            <TableHead className="text-right">Last Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.company_id}>
              <TableCell>{companyMap.get(item.company_id) ?? item.company_id}</TableCell>
              <TableCell className="text-right">{formatNumber(item.campaigns_total)}</TableCell>
              <TableCell className="text-right">{formatNumber(item.leads_total)}</TableCell>
              <TableCell className="text-right">
                {formatNumber(item.outbound_messages_total)}
              </TableCell>
              <TableCell className="text-right">{formatNumber(item.replies_total)}</TableCell>
              <TableCell className="text-right">{formatPercent(item.reply_rate)}</TableCell>
              <TableCell className="text-right">
                {item.last_activity_at ? formatRelativeTime(item.last_activity_at) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

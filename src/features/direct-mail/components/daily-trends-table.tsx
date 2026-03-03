"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";

interface DirectMailDailyTrendItem {
  day: string;
  created: number;
  processed: number;
  in_transit: number;
  delivered: number;
  returned: number;
  failed: number;
}

interface DailyTrendsTableProps {
  items: DirectMailDailyTrendItem[];
}

export function DailyTrendsTable({ items }: DailyTrendsTableProps) {
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()
      ),
    [items]
  );

  const visibleRows = showAll ? sorted : sorted.slice(0, 30);
  const hasMore = sorted.length > 30;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="text-right">Processed</TableHead>
              <TableHead className="text-right">In Transit</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Returned</TableHead>
              <TableHead className="text-right">Failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((trend, index) => (
              <TableRow
                key={trend.day}
                className={index % 2 === 0 ? "bg-transparent" : "bg-zinc-900/40"}
              >
                <TableCell>{formatTrendDate(trend.day)}</TableCell>
                <TableCell className="text-right">{formatNumber(trend.created)}</TableCell>
                <TableCell className="text-right">{formatNumber(trend.processed)}</TableCell>
                <TableCell className="text-right">{formatNumber(trend.in_transit)}</TableCell>
                <TableCell className="text-right">{formatNumber(trend.delivered)}</TableCell>
                <TableCell className="text-right">{formatNumber(trend.returned)}</TableCell>
                <TableCell className="text-right">{formatNumber(trend.failed)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {hasMore && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Show last 30" : "Show all"}
          </Button>
        </div>
      )}
    </div>
  );
}

function formatTrendDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

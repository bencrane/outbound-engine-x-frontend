"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/format";

const DEFAULT_TYPE_ORDER = ["postcard", "letter", "self_mailer", "check"] as const;
const DEFAULT_STATUS_ORDER = [
  "queued",
  "processing",
  "ready_for_mail",
  "in_transit",
  "delivered",
  "returned",
  "canceled",
  "failed",
] as const;
const DEFAULT_TYPE_SET = new Set<string>(DEFAULT_TYPE_ORDER);
const DEFAULT_STATUS_SET = new Set<string>(DEFAULT_STATUS_ORDER);

interface VolumeByTypeStatusItem {
  piece_type: string;
  status: string;
  count: number;
}

interface VolumePivotTableProps {
  items: VolumeByTypeStatusItem[];
}

export function VolumePivotTable({ items }: VolumePivotTableProps) {
  const extraTypes = Array.from(
    new Set(items.map((item) => item.piece_type).filter((type) => !DEFAULT_TYPE_SET.has(type)))
  ).sort((a, b) => a.localeCompare(b));
  const rowTypes = [...DEFAULT_TYPE_ORDER, ...extraTypes];

  const extraStatuses = Array.from(
    new Set(
      items
        .map((item) => item.status)
        .filter((status) => !DEFAULT_STATUS_SET.has(status))
    )
  ).sort((a, b) => a.localeCompare(b));
  const statusColumns = [...DEFAULT_STATUS_ORDER, ...extraStatuses];

  const pivot = new Map<string, Map<string, number>>();
  for (const item of items) {
    if (!pivot.has(item.piece_type)) {
      pivot.set(item.piece_type, new Map());
    }
    const row = pivot.get(item.piece_type)!;
    row.set(item.status, (row.get(item.status) ?? 0) + item.count);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            {statusColumns.map((status) => (
              <TableHead key={status} className={statusTextClass(status)}>
                {humanize(status)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rowTypes.map((type) => {
            const row = pivot.get(type);
            return (
              <TableRow key={type}>
                <TableCell>{humanize(type)}</TableCell>
                {statusColumns.map((status) => {
                  const value = row?.get(status) ?? 0;
                  return (
                    <TableCell key={status} className="text-right">
                      {value === 0 ? (
                        <span className="text-zinc-500">-</span>
                      ) : (
                        formatNumber(value)
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function statusTextClass(status: string) {
  switch (status) {
    case "queued":
    case "canceled":
      return "text-zinc-400";
    case "processing":
      return "text-zinc-300";
    case "ready_for_mail":
    case "returned":
      return "text-amber-400";
    case "in_transit":
      return "text-blue-400";
    case "delivered":
      return "text-emerald-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-zinc-400";
  }
}

function humanize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { TAMCompany } from "@/features/tam/api";
import { formatRelativeTime } from "@/lib/format";

export type TAMCompanySortField = "name" | "domain" | "industry" | "updated";
export type SortDirection = "asc" | "desc";

interface TAMCompaniesTableProps {
  companies: TAMCompany[];
  isLoading: boolean;
  error: Error | null;
  sortField: TAMCompanySortField;
  sortDirection: SortDirection;
  onSortChange: (field: TAMCompanySortField) => void;
}

export function TAMCompaniesTable({
  companies,
  isLoading,
  error,
  sortField,
  sortDirection,
  onSortChange,
}: TAMCompaniesTableProps) {
  if (error) {
    return (
      <div className="rounded-md bg-red-500/10 p-4 border border-red-500/20">
        <p className="text-sm text-red-400 font-medium">Failed to load companies</p>
        <p className="mt-1 text-xs text-red-400/80 font-mono break-all">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return <TableSkeleton cols={5} />;
  }

  if (companies.length === 0) {
    return <p className="text-sm text-zinc-400">No companies found</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              label="Name"
              field="name"
              activeField={sortField}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <SortableHead
              label="Domain"
              field="domain"
              activeField={sortField}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <SortableHead
              label="Industry"
              field="industry"
              activeField={sortField}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
            <TableHead>Location</TableHead>
            <SortableHead
              label="Added"
              field="updated"
              activeField={sortField}
              direction={sortDirection}
              onSortChange={onSortChange}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.entity_id}>
              <TableCell className="font-medium text-white">{company.canonical_name ?? "-"}</TableCell>
              <TableCell className="text-zinc-400">{company.canonical_domain ?? "-"}</TableCell>
              <TableCell className="text-zinc-400">{company.industry ?? "-"}</TableCell>
              <TableCell className="text-zinc-400">{company.hq_country ?? "-"}</TableCell>
              <TableCell className="text-zinc-400">
                {formatRelativeTime(company.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SortableHead({
  label,
  field,
  activeField,
  direction,
  onSortChange,
}: {
  label: string;
  field: TAMCompanySortField;
  activeField: TAMCompanySortField;
  direction: SortDirection;
  onSortChange: (field: TAMCompanySortField) => void;
}) {
  const isActive = activeField === field;

  return (
    <TableHead
      className="cursor-pointer hover:text-white"
      onClick={() => onSortChange(field)}
    >
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : null}
      </div>
    </TableHead>
  );
}

export function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid gap-3 py-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

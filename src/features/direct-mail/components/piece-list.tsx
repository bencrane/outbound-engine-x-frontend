"use client";

import { useQueries } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchDirectMailList,
  useCancelDirectMailPiece,
  useDirectMailPieces,
  type PieceType,
} from "@/features/direct-mail/api";
import { PieceDetailPanel } from "@/features/direct-mail/components/piece-detail-panel";
import { PieceStatusBadge } from "@/features/direct-mail/components/piece-status-badge";
import { useCompanyContext, useCompanyFilters } from "@/lib/company-context";
import { formatDate } from "@/lib/format";
import { useCompanies } from "@/lib/hooks";

const statusFilters = [
  "all",
  "queued",
  "processing",
  "in_transit",
  "delivered",
  "returned",
  "failed",
] as const;

type StatusFilter = (typeof statusFilters)[number];

interface PieceListProps {
  pieceType: PieceType;
}

export function PieceList({ pieceType }: PieceListProps) {
  const canManage = usePermission("direct-mail.manage");
  const { selectedCompanyId } = useCompanyContext();
  const companyFilters = useCompanyFilters();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const shouldLoadAllCompanies = companyFilters.all_companies === true && selectedCompanyId === null;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedPieceId, setExpandedPieceId] = useState<string | null>(null);
  const cancelPiece = useCancelDirectMailPiece();
  const singleCompanyPieces = useDirectMailPieces(pieceType, companyFilters.company_id, {
    enabled: !shouldLoadAllCompanies,
  });
  const allCompanyPieces = useQueries({
    queries: shouldLoadAllCompanies
      ? companies.map((company) => ({
          queryKey: ["direct-mail", pieceType, "list", company.id],
          queryFn: async () => {
            const response = await fetchDirectMailList(pieceType, company.id);
            if (response.error || !response.data) {
              throw new Error("Failed to fetch direct mail pieces.");
            }
            return response.data;
          },
        }))
      : [],
  });

  const pieces = useMemo(() => {
    if (!shouldLoadAllCompanies) {
      return singleCompanyPieces.data?.pieces ?? [];
    }
    return allCompanyPieces.flatMap((query) => query.data?.pieces ?? []);
  }, [allCompanyPieces, shouldLoadAllCompanies, singleCompanyPieces.data?.pieces]);

  const isLoading = shouldLoadAllCompanies
    ? companiesLoading || allCompanyPieces.some((query) => query.isLoading || query.isFetching)
    : singleCompanyPieces.isLoading;
  const error = shouldLoadAllCompanies
    ? (allCompanyPieces.find((query) => query.error)?.error as Error | null) ?? null
    : ((singleCompanyPieces.error as Error | null) ?? null);
  const filtered = pieces.filter((piece) =>
    statusFilter === "all" ? true : piece.status === statusFilter
  );

  if (error) {
    return <p className="text-sm text-red-400">Failed to load direct mail pieces.</p>;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant={statusFilter === filter ? "default" : "secondary"}
            onClick={() => setStatusFilter(filter)}
          >
            {filter === "all" ? "All" : humanizeStatus(filter)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400">No pieces found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Send Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((piece) => (
                <Fragment key={piece.id}>
                  <TableRow>
                    <TableCell>
                      <button
                        type="button"
                        className="font-mono text-sm text-blue-400 hover:text-blue-300"
                        onClick={() =>
                          setExpandedPieceId((current) => (current === piece.id ? null : piece.id))
                        }
                      >
                        {piece.id.slice(0, 10)}...
                      </button>
                    </TableCell>
                    <TableCell>{piece.type}</TableCell>
                    <TableCell>
                      <PieceStatusBadge status={piece.status} />
                    </TableCell>
                    <TableCell>{piece.send_date ? formatDate(piece.send_date) : "-"}</TableCell>
                    <TableCell>{formatDate(piece.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="secondary">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              setExpandedPieceId((current) => (current === piece.id ? null : piece.id))
                            }
                          >
                            View Details
                          </DropdownMenuItem>
                          {canManage && isCancellable(piece.status) && (
                            <DropdownMenuItem
                              className="text-red-300 hover:text-red-200"
                              onClick={() => {
                                if (!window.confirm("Cancel this direct mail piece?")) {
                                  return;
                                }
                                cancelPiece.mutate({ pieceType, pieceId: piece.id });
                              }}
                            >
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedPieceId === piece.id && (
                    <TableRow className="border-t-0">
                      <TableCell colSpan={6} className="bg-zinc-900/50">
                        <PieceDetailPanel pieceType={pieceType} pieceId={piece.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {cancelPiece.error && (
        <p className="text-sm text-red-400">Failed to cancel direct mail piece.</p>
      )}
    </div>
  );
}

function isCancellable(status: string) {
  return status === "queued" || status === "processing";
}

function humanizeStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

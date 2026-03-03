"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDirectMailPiece, type PieceType } from "@/features/direct-mail/api";
import { PieceStatusBadge } from "@/features/direct-mail/components/piece-status-badge";
import { formatDate, formatDateTime } from "@/lib/format";

interface PieceDetailPanelProps {
  pieceType: PieceType;
  pieceId: string;
}

export function PieceDetailPanel({ pieceType, pieceId }: PieceDetailPanelProps) {
  const { data: piece, isLoading, error } = useDirectMailPiece(pieceType, pieceId);
  const [showRaw, setShowRaw] = useState(false);

  if (error) {
    return <p className="text-sm text-red-400">Failed to load piece details.</p>;
  }

  if (isLoading || !piece) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>
    );
  }

  const metadata = piece.metadata ?? {};

  return (
    <div className="space-y-4 rounded-md border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono">
          {piece.id}
        </Badge>
        <Badge variant="secondary">{piece.type}</Badge>
        <PieceStatusBadge status={piece.status} />
      </div>

      <div className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
        <p>Provider: {piece.provider ?? "-"}</p>
        <p>Send Date: {piece.send_date ? formatDate(piece.send_date) : "-"}</p>
        <p>Created: {formatDateTime(piece.created_at)}</p>
        <p>Updated: {formatDateTime(piece.updated_at)}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-200">Metadata</p>
        {Object.keys(metadata).length === 0 ? (
          <p className="text-sm text-zinc-400">No metadata available.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="rounded-md border border-zinc-800 bg-zinc-950 p-2">
                <p className="text-xs text-zinc-500">{humanizeKey(key)}</p>
                <p className="mt-1 text-sm text-zinc-100">{formatValue(value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Button variant="secondary" size="sm" onClick={() => setShowRaw((value) => !value)}>
          {showRaw ? "Hide raw data" : "Show raw data"}
        </Button>
        {showRaw && (
          <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-zinc-800 p-4 text-xs font-mono text-zinc-300">
            {JSON.stringify(piece, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function humanizeKey(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return "-";
  return JSON.stringify(value);
}

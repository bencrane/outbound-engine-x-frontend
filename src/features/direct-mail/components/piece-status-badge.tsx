import { Badge } from "@/components/ui/badge";

type PieceStatus =
  | "queued"
  | "processing"
  | "ready_for_mail"
  | "in_transit"
  | "delivered"
  | "returned"
  | "canceled"
  | "failed"
  | "unknown";

interface PieceStatusBadgeProps {
  status: string;
}

export function PieceStatusBadge({ status }: PieceStatusBadgeProps) {
  const normalized = isPieceStatus(status) ? status : "unknown";

  return <Badge variant={statusVariant(normalized)}>{humanizeStatus(normalized)}</Badge>;
}

function isPieceStatus(value: string): value is PieceStatus {
  return [
    "queued",
    "processing",
    "ready_for_mail",
    "in_transit",
    "delivered",
    "returned",
    "canceled",
    "failed",
    "unknown",
  ].includes(value);
}

function statusVariant(status: PieceStatus) {
  switch (status) {
    case "processing":
      return "secondary";
    case "ready_for_mail":
      return "warning";
    case "in_transit":
      return "default";
    case "delivered":
      return "success";
    case "returned":
      return "warning";
    case "canceled":
      return "secondary";
    case "failed":
      return "destructive";
    case "queued":
    case "unknown":
    default:
      return "outline";
  }
}

function humanizeStatus(status: PieceStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

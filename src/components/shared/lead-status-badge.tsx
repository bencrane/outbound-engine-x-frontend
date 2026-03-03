import { Badge } from "@/components/ui/badge";
import type { components } from "@/lib/api-types";

type LeadStatus = components["schemas"]["CampaignLeadResponse"]["status"];

function getLeadStatusVariant(status: LeadStatus) {
  switch (status) {
    case "active":
      return "success";
    case "replied":
      return "default";
    case "contacted":
    case "connected":
      return "secondary";
    case "paused":
      return "warning";
    case "bounced":
    case "unsubscribed":
    case "not_interested":
      return "destructive";
    case "pending":
    case "unknown":
    default:
      return "outline";
  }
}

interface LeadStatusBadgeProps {
  status: LeadStatus;
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  return <Badge variant={getLeadStatusVariant(status)}>{status}</Badge>;
}

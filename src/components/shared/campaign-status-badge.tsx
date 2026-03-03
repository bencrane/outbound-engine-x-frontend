import { Badge } from "@/components/ui/badge";

type CampaignStatus = "DRAFTED" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";

function isCampaignStatus(value: string): value is CampaignStatus {
  return ["DRAFTED", "ACTIVE", "PAUSED", "STOPPED", "COMPLETED"].includes(value);
}

function getCampaignStatusVariant(status: CampaignStatus) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PAUSED":
      return "warning";
    case "STOPPED":
      return "destructive";
    case "COMPLETED":
      return "default";
    case "DRAFTED":
    default:
      return "secondary";
  }
}

interface CampaignStatusBadgeProps {
  status: string;
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const normalizedStatus = isCampaignStatus(status) ? status : "DRAFTED";
  return <Badge variant={getCampaignStatusVariant(normalizedStatus)}>{status}</Badge>;
}

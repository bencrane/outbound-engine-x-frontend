import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { components } from "@/lib/api-types";

export type DirectionFilter = "all" | "inbound" | "outbound";

type Campaign = components["schemas"]["CampaignResponse"];

interface InboxFiltersProps {
  direction: DirectionFilter;
  onDirectionChange: (value: DirectionFilter) => void;
  campaignId: string;
  onCampaignChange: (value: string) => void;
  campaigns: Campaign[];
}

export function InboxFilters({
  direction,
  onDirectionChange,
  campaignId,
  onCampaignChange,
  campaigns,
}: InboxFiltersProps) {
  return (
    <div className="space-y-3 border-b border-zinc-800 bg-zinc-950 p-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={direction === "all" ? "default" : "secondary"}
          onClick={() => onDirectionChange("all")}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={direction === "inbound" ? "default" : "secondary"}
          onClick={() => onDirectionChange("inbound")}
        >
          Inbound
        </Button>
        <Button
          size="sm"
          variant={direction === "outbound" ? "default" : "secondary"}
          onClick={() => onDirectionChange("outbound")}
        >
          Outbound
        </Button>
      </div>

      <Select value={campaignId} onChange={(event) => onCampaignChange(event.target.value)}>
        <option value="">All Campaigns</option>
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

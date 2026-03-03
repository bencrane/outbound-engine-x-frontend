"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { NormalizedLead } from "@/features/leads/api";

export type ChannelFilter = "all" | "email" | "linkedin";

export interface CampaignOption {
  id: string;
  name: string;
  channel: "email" | "linkedin";
}

interface LeadsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  campaignId: string;
  onCampaignChange: (value: string) => void;
  channel: ChannelFilter;
  onChannelChange: (value: ChannelFilter) => void;
  status: string;
  onStatusChange: (value: string) => void;
  campaignOptions: CampaignOption[];
  allLeads: NormalizedLead[];
}

export function LeadsFilters({
  search,
  onSearchChange,
  campaignId,
  onCampaignChange,
  channel,
  onChannelChange,
  status,
  onStatusChange,
  campaignOptions,
  allLeads,
}: LeadsFiltersProps) {
  const statuses = Array.from(new Set(allLeads.map((lead) => lead.status))).sort((a, b) =>
    a.localeCompare(b)
  );

  const emailOptions = campaignOptions.filter((option) => option.channel === "email");
  const linkedinOptions = campaignOptions.filter((option) => option.channel === "linkedin");

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by name, email, or company..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="max-w-lg"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={campaignId}
          onChange={(event) => onCampaignChange(event.target.value)}
          className="w-64"
        >
          <option value="">All Campaigns</option>
          {emailOptions.length > 0 && (
            <optgroup label="Email">
              {emailOptions.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </optgroup>
          )}
          {linkedinOptions.length > 0 && (
            <optgroup label="LinkedIn">
              {linkedinOptions.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </optgroup>
          )}
        </Select>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={channel === "all" ? "default" : "secondary"}
            onClick={() => onChannelChange("all")}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={channel === "email" ? "default" : "secondary"}
            onClick={() => onChannelChange("email")}
          >
            Email
          </Button>
          <Button
            size="sm"
            variant={channel === "linkedin" ? "default" : "secondary"}
            onClick={() => onChannelChange("linkedin")}
          >
            LinkedIn
          </Button>
        </div>

        <Select
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="w-52"
        >
          <option value="">All Statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

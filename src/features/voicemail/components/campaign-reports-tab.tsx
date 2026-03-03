"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCampaigns, useLinkedinCampaigns } from "@/features/campaigns/api";
import { useCampaignVoicemailReport } from "@/features/voicemail/api";
import { useCompanyFilters } from "@/lib/company-context";

export function CampaignReportsTab() {
  const canManage = usePermission("voicedrop.manage");
  const companyFilters = useCompanyFilters();
  const { data: campaigns = [], isLoading: campaignsLoading, error: campaignsError } =
    useCampaigns(companyFilters);
  const { data: linkedinCampaigns = [], isLoading: linkedinLoading, error: linkedinError } =
    useLinkedinCampaigns(companyFilters);

  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [requestedCampaignId, setRequestedCampaignId] = useState("");

  const reportQuery = useCampaignVoicemailReport(requestedCampaignId);

  const campaignOptions = useMemo(
    () =>
      [
        ...campaigns.map((campaign) => ({ id: campaign.id, name: campaign.name })),
        ...linkedinCampaigns.map((campaign) => ({ id: campaign.id, name: campaign.name })),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    [campaigns, linkedinCampaigns]
  );

  if (!canManage) {
    return (
      <p className="text-sm text-zinc-400">
        You do not have permission to generate campaign voicemail reports.
      </p>
    );
  }

  const generate = () => {
    if (!selectedCampaignId) {
      return;
    }
    if (selectedCampaignId === requestedCampaignId) {
      void reportQuery.refetch();
      return;
    }
    setRequestedCampaignId(selectedCampaignId);
  };

  const csvUrl = extractCsvUrl(reportQuery.data);
  const inlineRows = toInlineRows(reportQuery.data);

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-lg font-medium text-white">Campaign Reports</h3>

      <div className="space-y-2 max-w-lg">
        <label className="text-sm font-medium text-zinc-200">Campaign</label>
        <Select
          value={selectedCampaignId}
          onChange={(event) => setSelectedCampaignId(event.target.value)}
          disabled={campaignsLoading || linkedinLoading}
        >
          <option value="">Select campaign</option>
          {campaignOptions.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
      </div>

      <Button onClick={generate} disabled={!selectedCampaignId || reportQuery.isFetching}>
        {reportQuery.isFetching ? "Generating..." : "Generate Report"}
      </Button>

      {(campaignsError || linkedinError) && (
        <p className="text-sm text-red-400">Failed to load campaigns for report selection.</p>
      )}
      {reportQuery.error && (
        <p className="text-sm text-red-400">Failed to generate campaign voicemail report.</p>
      )}

      {csvUrl && (
        <a href={csvUrl} target="_blank" rel="noreferrer">
          <Button variant="secondary">
            <Download className="mr-1 h-4 w-4" />
            Download CSV
          </Button>
        </a>
      )}

      {!csvUrl && inlineRows && inlineRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                {Object.keys(inlineRows[0]).map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inlineRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Object.keys(inlineRows[0]).map((column) => (
                    <TableCell key={`${rowIndex}-${column}`}>{String(row[column] ?? "-")}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {requestedCampaignId &&
        !reportQuery.isFetching &&
        !reportQuery.error &&
        !csvUrl &&
        (!inlineRows || inlineRows.length === 0) && (
          <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
            {JSON.stringify(reportQuery.data, null, 2)}
          </pre>
        )}
    </div>
  );
}

function extractCsvUrl(data: unknown): string | null {
  if (typeof data === "string" && data.startsWith("http")) {
    return data;
  }
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  const keys = ["csv_url", "download_url", "url", "report_url"];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.startsWith("http")) {
      return value;
    }
  }
  return null;
}

function toInlineRows(data: unknown): Array<Record<string, unknown>> | null {
  if (Array.isArray(data) && data.every((row) => row && typeof row === "object")) {
    return data as Array<Record<string, unknown>>;
  }
  if (!data || typeof data !== "object") {
    return null;
  }
  const rows = (data as Record<string, unknown>).rows;
  if (Array.isArray(rows) && rows.every((row) => row && typeof row === "object")) {
    return rows as Array<Record<string, unknown>>;
  }
  return null;
}

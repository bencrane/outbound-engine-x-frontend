"use client";

import { ChevronLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { usePermission } from "@/components/gate";
import { RouteGuard } from "@/components/route-guard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCampaign,
  useLinkedinCampaign,
  useLinkedinCampaignAction,
  useUpdateCampaignStatus,
} from "@/features/campaigns/api";
import { CampaignLeadsTab } from "@/features/campaigns/components/campaign-leads-tab";
import { CampaignOverviewTab } from "@/features/campaigns/components/campaign-overview-tab";
import { CampaignRepliesTab } from "@/features/campaigns/components/campaign-replies-tab";
import { CampaignSequenceTab } from "@/features/campaigns/components/campaign-sequence-tab";
import { CampaignStatusBadge } from "@/components/shared/campaign-status-badge";
import { LinkedinLeadsTab } from "@/features/campaigns/components/linkedin-leads-tab";
import { LinkedinOverviewTab } from "@/features/campaigns/components/linkedin-overview-tab";
import { formatDate } from "@/lib/format";

type CampaignStatus = "DRAFTED" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const campaignId = params?.id;
  const channel = searchParams.get("channel");
  const isLinkedin = channel === "linkedin";
  const canManage = usePermission("campaigns.manage");
  const updateStatus = useUpdateCampaignStatus();
  const mutateLinkedinStatus = useLinkedinCampaignAction();

  const emailCampaignQuery = useCampaign(campaignId ?? "", !isLinkedin);
  const linkedinCampaignQuery = useLinkedinCampaign(campaignId ?? "", isLinkedin);
  const campaign = isLinkedin ? linkedinCampaignQuery.data : emailCampaignQuery.data;
  const isLoading = isLinkedin ? linkedinCampaignQuery.isLoading : emailCampaignQuery.isLoading;
  const error = isLinkedin ? linkedinCampaignQuery.error : emailCampaignQuery.error;

  if (!campaignId) {
    return (
      <RouteGuard permission="campaigns.list">
        <div className="p-8">
          <p className="text-sm text-red-400">Invalid campaign ID.</p>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard permission="campaigns.list">
      <div className="p-8">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>

        {isLoading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : error || !campaign ? (
          <p className="mt-4 text-sm text-red-400">
            Failed to load campaign details.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-white">{campaign.name}</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Created {formatDate(campaign.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CampaignStatusBadge status={campaign.status} />
                {canManage &&
                  (!isLinkedin || getLinkedinCampaignActions(campaign.status).length > 0) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {isLinkedin ? "Actions" : "Change status"}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {isLinkedin
                        ? getLinkedinCampaignActions(campaign.status).map((action) => (
                            <DropdownMenuItem
                              key={action}
                              onClick={() =>
                                mutateLinkedinStatus.mutate({
                                  campaignId,
                                  action,
                                })
                              }
                            >
                              {action === "pause" ? "Pause" : "Resume"}
                            </DropdownMenuItem>
                          ))
                        : getCampaignStatusActions(campaign.status).map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() =>
                                updateStatus.mutate({
                                  campaignId,
                                  status,
                                })
                              }
                            >
                              Mark as {status}
                            </DropdownMenuItem>
                          ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {(updateStatus.error || mutateLinkedinStatus.error) && (
              <p className="mt-2 text-sm text-red-400">
                Failed to update campaign status.
              </p>
            )}

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                {!isLinkedin && <TabsTrigger value="sequence">Sequence</TabsTrigger>}
                {!isLinkedin && <TabsTrigger value="replies">Replies</TabsTrigger>}
              </TabsList>

              <TabsContent value="overview">
                {isLinkedin ? (
                  <LinkedinOverviewTab campaignId={campaignId} />
                ) : (
                  <CampaignOverviewTab campaignId={campaignId} />
                )}
              </TabsContent>
              <TabsContent value="leads">
                {isLinkedin ? (
                  <LinkedinLeadsTab campaignId={campaignId} />
                ) : (
                  <CampaignLeadsTab campaignId={campaignId} />
                )}
              </TabsContent>
              {!isLinkedin && (
                <TabsContent value="sequence">
                  <CampaignSequenceTab campaignId={campaignId} />
                </TabsContent>
              )}
              {!isLinkedin && (
                <TabsContent value="replies">
                  <CampaignRepliesTab campaignId={campaignId} />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </div>
    </RouteGuard>
  );
}

function getCampaignStatusActions(status: CampaignStatus): CampaignStatus[] {
  switch (status) {
    case "DRAFTED":
      return ["ACTIVE", "STOPPED"];
    case "ACTIVE":
      return ["PAUSED", "STOPPED"];
    case "PAUSED":
      return ["ACTIVE", "STOPPED"];
    case "STOPPED":
      return ["ACTIVE"];
    case "COMPLETED":
    default:
      return [];
  }
}

function getLinkedinCampaignActions(status: CampaignStatus): Array<"pause" | "resume"> {
  if (status === "ACTIVE") {
    return ["pause"];
  }
  if (status === "PAUSED") {
    return ["resume"];
  }
  return [];
}

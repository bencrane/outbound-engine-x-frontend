"use client";

import { ChevronLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

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
  useActivateCampaign,
  useCampaign,
  useCampaignLeads,
  useLinkedinCampaign,
  useLinkedinCampaignAction,
  useMultiChannelSequence,
  useUpdateCampaignStatus,
} from "@/features/campaigns/api";
import { CampaignLeadsTab } from "@/features/campaigns/components/campaign-leads-tab";
import { CampaignOverviewTab } from "@/features/campaigns/components/campaign-overview-tab";
import { CampaignRepliesTab } from "@/features/campaigns/components/campaign-replies-tab";
import { CampaignSequenceTab } from "@/features/campaigns/components/campaign-sequence-tab";
import { LeadProgressTab } from "@/features/campaigns/components/lead-progress-tab";
import { MultiChannelLeadsTab } from "@/features/campaigns/components/multi-channel-leads-tab";
import { MultiChannelSequenceEditor } from "@/features/campaigns/components/multi-channel-sequence-editor";
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
  const isMulti = channel === "multi";
  const canManage = usePermission("campaigns.manage");
  const updateStatus = useUpdateCampaignStatus();
  const mutateLinkedinStatus = useLinkedinCampaignAction();
  const activateCampaign = useActivateCampaign();
  const [multiActionError, setMultiActionError] = useState<string | null>(null);

  const emailCampaignQuery = useCampaign(campaignId ?? "", !isLinkedin);
  const linkedinCampaignQuery = useLinkedinCampaign(campaignId ?? "", isLinkedin);
  const multiSequenceQuery = useMultiChannelSequence(campaignId ?? "", isMulti);
  const multiLeadsQuery = useCampaignLeads(campaignId ?? "", isMulti);
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
                  isMulti &&
                  campaign.status === "DRAFTED" && (
                    <Button
                      onClick={() => {
                        setMultiActionError(null);
                        const sequenceCount = multiSequenceQuery.data?.length ?? 0;
                        const leadCount = multiLeadsQuery.data?.length ?? 0;
                        if (sequenceCount === 0 || leadCount === 0) {
                          setMultiActionError(
                            "Activate requires at least one sequence step and one lead."
                          );
                          return;
                        }
                        activateCampaign.mutate(
                          { campaignId },
                          {
                            onError: () => {
                              setMultiActionError("Failed to activate campaign.");
                            },
                          }
                        );
                      }}
                      disabled={
                        activateCampaign.isPending ||
                        multiSequenceQuery.isLoading ||
                        multiLeadsQuery.isLoading
                      }
                    >
                      {activateCampaign.isPending ? "Activating..." : "Activate"}
                    </Button>
                  )}
                {canManage && isMulti && campaign.status === "ACTIVE" && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateStatus.mutate({ campaignId, status: "PAUSED" })}
                    >
                      Pause
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateStatus.mutate({ campaignId, status: "STOPPED" })}
                    >
                      Stop
                    </Button>
                  </>
                )}
                {canManage && isMulti && campaign.status === "PAUSED" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => updateStatus.mutate({ campaignId, status: "ACTIVE" })}
                    >
                      Resume
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateStatus.mutate({ campaignId, status: "STOPPED" })}
                    >
                      Stop
                    </Button>
                  </>
                )}
                {canManage &&
                  !isMulti &&
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

            {(updateStatus.error || mutateLinkedinStatus.error || activateCampaign.error) && (
              <p className="mt-2 text-sm text-red-400">
                Failed to update campaign status.
              </p>
            )}
            {multiActionError && <p className="mt-2 text-sm text-red-400">{multiActionError}</p>}

            <Tabs defaultValue={isMulti ? "sequence" : "overview"} className="mt-6">
              <TabsList>
                {isMulti ? (
                  <>
                    <TabsTrigger value="sequence">Sequence</TabsTrigger>
                    <TabsTrigger value="leads">Leads</TabsTrigger>
                    <TabsTrigger value="progress">Progress</TabsTrigger>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                  </>
                ) : (
                  <>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="leads">Leads</TabsTrigger>
                    {!isLinkedin && <TabsTrigger value="sequence">Sequence</TabsTrigger>}
                    {!isLinkedin && <TabsTrigger value="replies">Replies</TabsTrigger>}
                  </>
                )}
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
                ) : isMulti ? (
                  <MultiChannelLeadsTab campaignId={campaignId} />
                ) : (
                  <CampaignLeadsTab campaignId={campaignId} />
                )}
              </TabsContent>
              {isMulti ? (
                <TabsContent value="sequence">
                  <MultiChannelSequenceEditor
                    campaignId={campaignId}
                    campaignStatus={campaign.status}
                  />
                </TabsContent>
              ) : (
                !isLinkedin && (
                  <TabsContent value="sequence">
                    <CampaignSequenceTab campaignId={campaignId} />
                  </TabsContent>
                )
              )}
              {isMulti ? (
                <TabsContent value="progress">
                  <LeadProgressTab campaignId={campaignId} />
                </TabsContent>
              ) : (
                !isLinkedin && (
                  <TabsContent value="replies">
                    <CampaignRepliesTab campaignId={campaignId} />
                  </TabsContent>
                )
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

"use client";

import { useQueries } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  campaignQueryKeys,
  fetchLeadStepContent,
  useActivateCampaign,
  useCampaignLeads,
  useMultiChannelSequence,
} from "@/features/campaigns/api";
import { ChannelIcon } from "@/features/campaigns/components/channel-icon";

interface ActivationReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

export function ActivationReview({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: ActivationReviewProps) {
  const sequenceQuery = useMultiChannelSequence(campaignId, open);
  const leadsQuery = useCampaignLeads(campaignId, open);
  const activateCampaign = useActivateCampaign();

  const sequence = sequenceQuery.data ?? [];
  const leads = leadsQuery.data ?? [];
  const hasVoicemailStep = sequence.some((step) => step.channel === "voicemail");
  const hasEmailStep = sequence.some((step) => step.channel === "email");

  const stepContentQueries = useQueries({
    queries: leads.map((lead) => ({
      queryKey: campaignQueryKeys.leadStepContent(campaignId, lead.id),
      queryFn: async () => fetchLeadStepContent(campaignId, lead.id),
      enabled: open && Boolean(campaignId),
    })),
  });

  const isStepContentLoading = stepContentQueries.some((query) => query.isLoading);
  const stepContentError = stepContentQueries.find((query) => query.error)?.error as Error | undefined;

  const personalizedLeads = leads.filter((_, index) => {
    const data = stepContentQueries[index]?.data;
    return Array.isArray(data) && data.length > 0;
  });
  const templateOnlyLeads = leads.filter((lead) => !personalizedLeads.some((row) => row.id === lead.id));

  const missingPhoneLeads = hasVoicemailStep
    ? leads.filter((lead) => {
        const leadRecord = lead as Record<string, unknown>;
        return !toStringValue(leadRecord.phone) && !toStringValue(leadRecord.phone_number);
      })
    : [];
  const missingEmailLeads = hasEmailStep
    ? leads.filter((lead) => !toStringValue(lead.email))
    : [];
  const missingConfigSteps = sequence.filter((step) => !step.action_config || Object.keys(step.action_config).length === 0);

  const canActivate =
    sequence.length > 0 &&
    leads.length > 0 &&
    !sequenceQuery.isLoading &&
    !leadsQuery.isLoading &&
    !isStepContentLoading &&
    !sequenceQuery.error &&
    !leadsQuery.error &&
    !stepContentError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Before Activation</DialogTitle>
          <DialogDescription>
            Confirm sequence and lead readiness before activating this campaign.
          </DialogDescription>
        </DialogHeader>

        {sequenceQuery.error || leadsQuery.error ? (
          <p className="px-5 text-sm text-red-400">Failed to load activation review data.</p>
        ) : (
          <div className="space-y-4 px-5 pb-4">
            <div className="space-y-1 text-sm text-zinc-300">
              <p>Campaign: {campaignName}</p>
              <p>
                Steps: {sequence.length} ({sequence.map((step) => toLabel(step.channel)).join(" -> ")})
              </p>
              <p>Leads: {leads.length}</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personalization Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {isStepContentLoading ? (
                  <p className="text-zinc-400">Checking lead personalization...</p>
                ) : stepContentError ? (
                  <p className="text-red-400">Failed to check lead personalization.</p>
                ) : (
                  <>
                    <p className="text-emerald-400">
                      {personalizedLeads.length} of {leads.length} leads have personalized content
                    </p>
                    <p className="text-zinc-400">
                      {templateOnlyLeads.length} leads will use template defaults
                    </p>
                    {templateOnlyLeads.length > 0 && (
                      <div className="pt-1">
                        <p className="mb-1 text-zinc-400">Leads using templates:</p>
                        <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                          {templateOnlyLeads.map((lead) => (
                            <li key={lead.id}>{lead.email ?? lead.id}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sequence Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {sequence.length === 0 ? (
                  <p className="text-zinc-400">No sequence configured.</p>
                ) : (
                  sequence
                    .slice()
                    .sort((a, b) => a.step_order - b.step_order)
                    .map((step) => (
                      <div key={step.id ?? step.step_order} className="flex items-center gap-2 text-zinc-300">
                        <span>Step {step.step_order}:</span>
                        <ChannelIcon channel={step.channel} className="h-4 w-4 text-zinc-300" />
                        <span>{toLabel(step.action_type)}</span>
                        <span className="text-zinc-500">Day +{step.delay_days}</span>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            {missingPhoneLeads.length > 0 && (
              <WarningCard text={`${missingPhoneLeads.length} leads have no phone number (voicemail steps will fail).`} />
            )}
            {missingEmailLeads.length > 0 && (
              <WarningCard text={`${missingEmailLeads.length} leads have no email (email steps will fail).`} />
            )}
            {missingConfigSteps.length > 0 && (
              <WarningCard text={`${missingConfigSteps.length} steps are missing channel config fields.`} />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              activateCampaign.mutate(
                { campaignId },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                  },
                }
              )
            }
            disabled={!canActivate || activateCampaign.isPending}
          >
            {activateCampaign.isPending ? "Activating..." : "Activate Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WarningCard({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-600/10 p-3 text-yellow-400">
      <p className="flex items-start gap-2 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{text}</span>
      </p>
    </div>
  );
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

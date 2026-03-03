"use client";

import type { MultiChannelStep } from "@/features/campaigns/api";
import { ChannelIcon } from "@/features/campaigns/components/channel-icon";

interface MultiChannelSequenceViewProps {
  steps: MultiChannelStep[];
}

export function MultiChannelSequenceView({ steps }: MultiChannelSequenceViewProps) {
  if (steps.length === 0) {
    return <p className="text-sm text-zinc-400">No sequence configured yet.</p>;
  }

  return (
    <div className="space-y-4">
      {steps
        .slice()
        .sort((a, b) => a.step_order - b.step_order)
        .map((step) => (
          <div key={step.id ?? `${step.step_order}-${step.action_type}`} className="rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2">
              <ChannelIcon channel={step.channel} className="h-4 w-4 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-100">
                Step {step.step_order}: {toLabel(step.action_type)}
              </p>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{renderDelay(step.delay_days, step.step_order)}</p>
            <p className="mt-1 text-sm text-zinc-500">
              Skip if: {step.skip_if ? renderSkipCondition(step.skip_if) : "None"}
            </p>
            <p className="mt-2 text-sm text-zinc-300">{renderConfigSummary(step)}</p>
          </div>
        ))}
    </div>
  );
}

function renderDelay(delayDays: number, stepOrder: number): string {
  if (stepOrder === 1 && delayDays === 0) {
    return "Immediately";
  }
  if (delayDays === 0) {
    return "0 days after previous step";
  }
  return `${delayDays} day${delayDays === 1 ? "" : "s"} after previous step`;
}

function toLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function renderSkipCondition(skipIf: NonNullable<MultiChannelStep["skip_if"]>) {
  if (skipIf.event === "reply_received") return "Reply received";
  if (skipIf.event === "inbound_message_received") return "Inbound message received";
  if (skipIf.lead_status === "unsubscribed") return "Lead unsubscribed";
  return "Custom condition";
}

function renderConfigSummary(step: MultiChannelStep): string {
  if (step.channel === "email") {
    const subject =
      typeof step.action_config.subject === "string" ? step.action_config.subject : "";
    return subject ? `Subject: ${subject}` : "Email step";
  }
  if (step.channel === "linkedin") {
    const message =
      typeof step.action_config.message === "string" ? step.action_config.message : "";
    return message ? `Message: ${truncate(message)}` : "LinkedIn step";
  }
  if (step.channel === "direct_mail") {
    const description =
      typeof step.action_config.description === "string" ? step.action_config.description : "";
    return description ? `Description: ${description}` : "Direct mail step";
  }
  const script = typeof step.action_config.script === "string" ? step.action_config.script : "";
  if (script) {
    return `Script: ${truncate(script)}`;
  }
  const recordingUrl =
    typeof step.action_config.recording_url === "string" ? step.action_config.recording_url : "";
  return recordingUrl ? `Recording URL: ${recordingUrl}` : "Voicemail step";
}

function truncate(value: string) {
  if (value.length <= 80) {
    return value;
  }
  return `${value.slice(0, 77)}...`;
}

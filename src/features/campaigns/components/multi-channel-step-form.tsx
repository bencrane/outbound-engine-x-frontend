"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MultiChannelSkipCondition, MultiChannelStep } from "@/features/campaigns/api";
import { ChannelIcon } from "@/features/campaigns/components/channel-icon";

type Channel = MultiChannelStep["channel"];
type ActionType = MultiChannelStep["action_type"];

const CHANNEL_LABELS: Record<Channel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  direct_mail: "Direct Mail",
  voicemail: "Voicemail",
};

const ACTION_OPTIONS: Record<Channel, Array<{ value: ActionType; label: string }>> = {
  email: [{ value: "send_email", label: "Send Email" }],
  linkedin: [
    { value: "send_connection_request", label: "Connection Request" },
    { value: "send_linkedin_message", label: "LinkedIn Message" },
  ],
  direct_mail: [
    { value: "send_postcard", label: "Send Postcard" },
    { value: "send_letter", label: "Send Letter" },
  ],
  voicemail: [{ value: "send_voicemail", label: "Send Voicemail" }],
};

const SKIP_OPTION_VALUES = [
  "none",
  "reply_received",
  "inbound_message_received",
  "lead_unsubscribed",
] as const;

type SkipOptionValue = (typeof SKIP_OPTION_VALUES)[number];

export function getExecutionMode(channel: Channel): MultiChannelStep["execution_mode"] {
  return channel === "linkedin" ? "campaign_mediated" : "direct_single_touch";
}

export function getDefaultActionType(channel: Channel): ActionType {
  return ACTION_OPTIONS[channel][0].value;
}

export function getDefaultActionConfig(channel: Channel, actionType: ActionType): Record<string, unknown> {
  if (channel === "email" && actionType === "send_email") {
    return {
      subject: "",
      message: "",
      sender_email_id: "",
    };
  }
  if (channel === "linkedin") {
    return {
      message: "",
    };
  }
  if (channel === "direct_mail") {
    return {
      description: "",
      front_template: "",
      back_template: "",
      file: "",
    };
  }
  return {
    voice_clone_id: "",
    script: "",
    from_number: "",
    recording_url: "",
  };
}

interface MultiChannelStepFormProps {
  step: MultiChannelStep;
  stepIndex: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (step: MultiChannelStep) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function MultiChannelStepForm({
  step,
  stepIndex,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: MultiChannelStepFormProps) {
  const setActionConfig = (key: string, value: unknown) => {
    onChange({
      ...step,
      action_config: {
        ...step.action_config,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-100">Step {stepIndex + 1}</p>
          <ChannelIcon channel={step.channel} className="h-4 w-4 text-zinc-400" />
          <span className="text-xs text-zinc-400">{toActionLabel(step.action_type)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" disabled={!canMoveUp} onClick={onMoveUp}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" disabled={!canMoveDown} onClick={onMoveDown}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-red-300" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Channel</Label>
          <Select
            value={step.channel}
            onChange={(event) => {
              const nextChannel = event.target.value as Channel;
              const nextAction = getDefaultActionType(nextChannel);
              onChange({
                ...step,
                channel: nextChannel,
                action_type: nextAction,
                execution_mode: getExecutionMode(nextChannel),
                action_config: getDefaultActionConfig(nextChannel, nextAction),
                provider_campaign_id: null,
              });
            }}
          >
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Action Type</Label>
          <Select
            value={step.action_type}
            onChange={(event) => {
              const nextActionType = event.target.value as ActionType;
              onChange({
                ...step,
                action_type: nextActionType,
                action_config: getDefaultActionConfig(step.channel, nextActionType),
              });
            }}
          >
            {ACTION_OPTIONS[step.channel].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Delay</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={step.delay_days}
              onChange={(event) =>
                onChange({
                  ...step,
                  delay_days: Math.max(0, Number(event.target.value) || 0),
                })
              }
              className="w-28"
            />
            <span className="text-sm text-zinc-400">
              {stepIndex === 0 && step.delay_days === 0
                ? "Immediately"
                : "days after previous step"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Skip If</Label>
          <Select
            value={skipConditionToValue(step.skip_if)}
            onChange={(event) =>
              onChange({
                ...step,
                skip_if: valueToSkipCondition(event.target.value as SkipOptionValue),
              })
            }
          >
            <option value="none">None</option>
            <option value="reply_received">Reply Received</option>
            <option value="inbound_message_received">Inbound Message Received</option>
            <option value="lead_unsubscribed">Lead Unsubscribed</option>
          </Select>
        </div>
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="mb-3 text-sm font-medium text-zinc-200">
          {CHANNEL_LABELS[step.channel]} Config
        </p>
        {step.channel === "email" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={stringValue(step.action_config.subject)}
                onChange={(event) => setActionConfig("subject", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={6}
                value={stringValue(step.action_config.message)}
                onChange={(event) => setActionConfig("message", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sender Email ID (optional)</Label>
              <Input
                type="number"
                min={0}
                value={stringValue(step.action_config.sender_email_id)}
                onChange={(event) => setActionConfig("sender_email_id", event.target.value)}
              />
            </div>
          </div>
        )}

        {step.channel === "linkedin" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={3}
                value={stringValue(step.action_config.message)}
                onChange={(event) => setActionConfig("message", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Provider Campaign ID (optional)</Label>
              <Input
                value={step.provider_campaign_id ?? ""}
                onChange={(event) =>
                  onChange({
                    ...step,
                    provider_campaign_id: event.target.value || null,
                  })
                }
              />
            </div>
          </div>
        )}

        {step.channel === "direct_mail" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={stringValue(step.action_config.description)}
                onChange={(event) => setActionConfig("description", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Front Template</Label>
              <Input
                value={stringValue(step.action_config.front_template)}
                onChange={(event) => setActionConfig("front_template", event.target.value)}
              />
            </div>
            {step.action_type === "send_postcard" ? (
              <div className="space-y-2">
                <Label>Back Template</Label>
                <Input
                  value={stringValue(step.action_config.back_template)}
                  onChange={(event) => setActionConfig("back_template", event.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>File</Label>
                <Input
                  value={stringValue(step.action_config.file)}
                  onChange={(event) => setActionConfig("file", event.target.value)}
                />
              </div>
            )}
            <p className="text-xs text-zinc-500">Address pulled from lead data.</p>
          </div>
        )}

        {step.channel === "voicemail" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Voice Clone ID</Label>
              <Input
                value={stringValue(step.action_config.voice_clone_id)}
                onChange={(event) => setActionConfig("voice_clone_id", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Script</Label>
              <Textarea
                rows={4}
                value={stringValue(step.action_config.script)}
                onChange={(event) => setActionConfig("script", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>From Number</Label>
              <Input
                value={stringValue(step.action_config.from_number)}
                onChange={(event) => setActionConfig("from_number", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Recording URL</Label>
              <Input
                value={stringValue(step.action_config.recording_url)}
                onChange={(event) => setActionConfig("recording_url", event.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function toActionLabel(actionType: ActionType): string {
  return actionType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function skipConditionToValue(skipIf: MultiChannelSkipCondition | null | undefined): SkipOptionValue {
  if (!skipIf) return "none";
  if (skipIf.event === "reply_received") return "reply_received";
  if (skipIf.event === "inbound_message_received") return "inbound_message_received";
  if (skipIf.lead_status === "unsubscribed") return "lead_unsubscribed";
  return "none";
}

function valueToSkipCondition(value: SkipOptionValue): MultiChannelSkipCondition | null {
  if (value === "reply_received") {
    return {
      event: "reply_received",
      direction: "inbound",
    };
  }
  if (value === "inbound_message_received") {
    return {
      event: "inbound_message_received",
      direction: "inbound",
    };
  }
  if (value === "lead_unsubscribed") {
    return {
      lead_status: "unsubscribed",
    };
  }
  return null;
}

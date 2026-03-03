"use client";

import { RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MultiChannelStep } from "@/features/campaigns/api";
import { ChannelIcon } from "@/features/campaigns/components/channel-icon";

export interface StepOverrideDraft {
  subject?: string;
  message?: string;
  description?: string;
  front?: string;
  back?: string;
  script?: string;
}

interface StepContentFormProps {
  step: MultiChannelStep;
  value: StepOverrideDraft;
  template: StepOverrideDraft;
  hasOverride: boolean;
  onChange: (value: StepOverrideDraft) => void;
  onReset: () => void;
  onSaveStep?: () => void;
  isSavingStep?: boolean;
}

export function StepContentForm({
  step,
  value,
  template,
  hasOverride,
  onChange,
  onReset,
  onSaveStep,
  isSavingStep = false,
}: StepContentFormProps) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">Step {step.step_order}:</span>
          <ChannelIcon channel={step.channel} className="h-4 w-4 text-zinc-300" />
          <span className="text-sm text-zinc-300">{toLabel(step.action_type)}</span>
        </div>
        {hasOverride ? <Badge variant="success">Has override</Badge> : <Badge variant="secondary">Using template</Badge>}
      </div>

      <div className="space-y-1">
        {step.channel === "email" && (
          <>
            <p className="text-sm italic text-zinc-500">
              Template subject: {template.subject || "-"}
            </p>
            <p className="text-sm italic text-zinc-500">
              Template message: {template.message || "-"}
            </p>
          </>
        )}
        {step.channel === "linkedin" && (
          <p className="text-sm italic text-zinc-500">Template message: {template.message || "-"}</p>
        )}
        {step.channel === "direct_mail" && (
          <>
            <p className="text-sm italic text-zinc-500">
              Template description: {template.description || "-"}
            </p>
            <p className="text-sm italic text-zinc-500">Template front: {template.front || "-"}</p>
            <p className="text-sm italic text-zinc-500">Template back: {template.back || "-"}</p>
          </>
        )}
        {step.channel === "voicemail" && (
          <p className="text-sm italic text-zinc-500">Template script: {template.script || "-"}</p>
        )}
      </div>

      <div className="space-y-3">
        {step.channel === "email" && (
          <>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={value.subject ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    subject: event.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={4}
                value={value.message ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    message: event.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        {step.channel === "linkedin" && (
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              rows={4}
              value={value.message ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  message: event.target.value,
                })
              }
            />
          </div>
        )}

        {step.channel === "direct_mail" && (
          <>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={value.description ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    description: event.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Front</Label>
              <Input
                value={value.front ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    front: event.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Back</Label>
              <Input
                value={value.back ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    back: event.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        {step.channel === "voicemail" && (
          <div className="space-y-2">
            <Label>Script</Label>
            <Textarea
              rows={4}
              value={value.script ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  script: event.target.value,
                })
              }
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset to template
        </Button>
        {onSaveStep && (
          <Button size="sm" onClick={onSaveStep} disabled={isSavingStep}>
            {isSavingStep ? "Saving..." : "Save Step"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function extractTemplateContent(step: MultiChannelStep): StepOverrideDraft {
  if (step.channel === "email") {
    return {
      subject: toStringValue(step.action_config.subject),
      message: toStringValue(step.action_config.message),
    };
  }
  if (step.channel === "linkedin") {
    return {
      message: toStringValue(step.action_config.message),
    };
  }
  if (step.channel === "direct_mail") {
    return {
      description: toStringValue(step.action_config.description),
      front:
        toStringValue(step.action_config.front) ||
        toStringValue(step.action_config.front_template),
      back:
        toStringValue(step.action_config.back) || toStringValue(step.action_config.back_template),
    };
  }
  return {
    script: toStringValue(step.action_config.script),
  };
}

export function normalizeOverrideForStep(
  step: MultiChannelStep,
  value: StepOverrideDraft
): Record<string, unknown> {
  if (step.channel === "email") {
    return compact({
      subject: value.subject,
      message: value.message,
    });
  }
  if (step.channel === "linkedin") {
    return compact({
      message: value.message,
    });
  }
  if (step.channel === "direct_mail") {
    return compact({
      description: value.description,
      front: value.front,
      back: value.back,
    });
  }
  return compact({
    script: value.script,
  });
}

export function overrideFromRecord(
  step: MultiChannelStep,
  record: Record<string, unknown>
): StepOverrideDraft {
  if (step.channel === "email") {
    return {
      subject: toStringValue(record.subject),
      message: toStringValue(record.message),
    };
  }
  if (step.channel === "linkedin") {
    return {
      message: toStringValue(record.message),
    };
  }
  if (step.channel === "direct_mail") {
    return {
      description: toStringValue(record.description),
      front: toStringValue(record.front),
      back: toStringValue(record.back),
    };
  }
  return {
    script: toStringValue(record.script),
  };
}

export function hasStepOverrideValues(value: StepOverrideDraft): boolean {
  return Object.values(value).some((fieldValue) => typeof fieldValue === "string" && fieldValue.trim().length > 0);
}

function toLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function compact(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined;
    })
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  fetchLeadStepContent,
  type MultiChannelStep,
  type StepContentOverride,
  useLeadStepContent,
  useMultiChannelSequence,
  useSaveLeadStepContent,
} from "@/features/campaigns/api";
import {
  extractTemplateContent,
  hasStepOverrideValues,
  normalizeOverrideForStep,
  overrideFromRecord,
  type StepOverrideDraft,
  StepContentForm,
} from "@/features/campaigns/components/step-content-form";

interface LeadContentEditorProps {
  campaignId: string;
  lead: {
    id: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  onClose: () => void;
  onOverrideStatusChange?: (leadId: string, hasOverride: boolean) => void;
}

export function LeadContentEditor({
  campaignId,
  lead,
  onClose,
  onOverrideStatusChange,
}: LeadContentEditorProps) {
  const { data: sequence = [], isLoading: sequenceLoading, error: sequenceError } =
    useMultiChannelSequence(campaignId);
  const {
    data: savedOverrides = [],
    isLoading: overridesLoading,
    error: overridesError,
  } = useLeadStepContent(campaignId, lead.id);
  const saveLeadStepContent = useSaveLeadStepContent();

  const [draftsByStepOrder, setDraftsByStepOrder] = useState<Record<number, StepOverrideDraft>>({});
  const [savedDraftsByStepOrder, setSavedDraftsByStepOrder] = useState<
    Record<number, StepOverrideDraft>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [savingStepOrder, setSavingStepOrder] = useState<number | null>(null);

  const sortedSteps = useMemo(
    () => sequence.slice().sort((a, b) => a.step_order - b.step_order),
    [sequence]
  );

  useEffect(() => {
    if (sortedSteps.length === 0) {
      return;
    }
    const nextMap = mapOverridesToDrafts(sortedSteps, savedOverrides);
    setDraftsByStepOrder(nextMap);
    setSavedDraftsByStepOrder(nextMap);
    onOverrideStatusChange?.(lead.id, Object.keys(nextMap).length > 0);
  }, [lead.id, onOverrideStatusChange, savedOverrides, sortedSteps]);

  if (sequenceError || overridesError) {
    return <p className="text-sm text-red-400">Failed to load lead content editor.</p>;
  }

  if (sequenceLoading || overridesLoading) {
    return <p className="text-sm text-zinc-400">Loading lead content...</p>;
  }

  if (sortedSteps.length === 0) {
    return <p className="text-sm text-zinc-400">No sequence steps available for personalization.</p>;
  }

  const leadName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || lead.email || lead.id;

  const saveStep = async (step: MultiChannelStep) => {
    setMessage(null);
    setSavingStepOrder(step.step_order);
    try {
      // Rebase on latest server state to avoid persisting unsaved local edits
      // from unrelated steps during a single-step save.
      const serverOverrides = await fetchLeadStepContent(campaignId, lead.id);
      const baselineMap = mapOverridesToDrafts(sortedSteps, serverOverrides);
      const currentDraft = draftsByStepOrder[step.step_order] ?? {};

      if (hasStepOverrideValues(currentDraft)) {
        baselineMap[step.step_order] = currentDraft;
      } else {
        delete baselineMap[step.step_order];
      }

      const payload = toStepContentPayload(sortedSteps, baselineMap);
      await saveLeadStepContent.mutateAsync({
        campaignId,
        leadId: lead.id,
        steps: payload,
      });

      setSavedDraftsByStepOrder(baselineMap);
      setMessage(`Step ${step.step_order} override saved.`);
      onOverrideStatusChange?.(lead.id, Object.keys(baselineMap).length > 0);
    } catch {
      setMessage(`Failed to save step ${step.step_order}.`);
    } finally {
      setSavingStepOrder(null);
    }
  };

  const saveAll = () => {
    setMessage(null);
    const payload = toStepContentPayload(sortedSteps, draftsByStepOrder);
    saveLeadStepContent.mutate(
      {
        campaignId,
        leadId: lead.id,
        steps: payload,
      },
      {
        onSuccess: () => {
          const nextSavedMap = buildNonEmptyDraftMap(sortedSteps, draftsByStepOrder);
          setSavedDraftsByStepOrder(nextSavedMap);
          setMessage("All step overrides saved.");
          onOverrideStatusChange?.(lead.id, Object.keys(nextSavedMap).length > 0);
        },
        onError: () => {
          setMessage("Failed to save step overrides.");
        },
      }
    );
  };

  return (
    <div className="space-y-4 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-100">
          Personalize: {leadName} ({lead.email ?? "no-email"})
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {sortedSteps.map((step) => {
        const value = draftsByStepOrder[step.step_order] ?? {};
        const hasOverride = hasStepOverrideValues(value);
        return (
          <StepContentForm
            key={step.id ?? step.step_order}
            step={step}
            value={value}
            template={extractTemplateContent(step)}
            hasOverride={hasOverride}
            onChange={(nextValue) =>
              setDraftsByStepOrder((current) => ({
                ...current,
                [step.step_order]: nextValue,
              }))
            }
            onReset={() =>
              setDraftsByStepOrder((current) => {
                const clone = { ...current };
                delete clone[step.step_order];
                return clone;
              })
            }
            onSaveStep={() => {
              void saveStep(step);
            }}
            isSavingStep={saveLeadStepContent.isPending && savingStepOrder === step.step_order}
          />
        );
      })}

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saveLeadStepContent.isPending}>
          {saveLeadStepContent.isPending ? "Saving..." : "Save All Steps"}
        </Button>
      </div>

      {message && (
        <p className={`text-sm ${message.includes("Failed") ? "text-red-400" : "text-zinc-300"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

function mapOverridesToDrafts(steps: MultiChannelStep[], overrides: StepContentOverride[]) {
  const stepByOrder = new Map(steps.map((step) => [step.step_order, step]));
  const result: Record<number, StepOverrideDraft> = {};

  for (const override of overrides) {
    const step = stepByOrder.get(override.step_order);
    if (!step) {
      continue;
    }
    const draft = overrideFromRecord(step, override.action_config_override ?? {});
    if (hasStepOverrideValues(draft)) {
      result[override.step_order] = draft;
    }
  }

  return result;
}

function buildNonEmptyDraftMap(
  steps: MultiChannelStep[],
  draftsByStepOrder: Record<number, StepOverrideDraft>
) {
  const map: Record<number, StepOverrideDraft> = {};
  for (const step of steps) {
    const draft = draftsByStepOrder[step.step_order] ?? {};
    if (hasStepOverrideValues(draft)) {
      map[step.step_order] = draft;
    }
  }
  return map;
}

function toStepContentPayload(
  steps: MultiChannelStep[],
  draftsByStepOrder: Record<number, StepOverrideDraft>
): StepContentOverride[] {
  return steps
    .map((step) => {
      const draft = draftsByStepOrder[step.step_order] ?? {};
      if (!hasStepOverrideValues(draft)) {
        return null;
      }
      return {
        step_order: step.step_order,
        action_config_override: normalizeOverrideForStep(step, draft),
      };
    })
    .filter((value): value is StepContentOverride => Boolean(value));
}

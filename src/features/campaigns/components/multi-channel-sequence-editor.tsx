"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  type MultiChannelStep,
  useMultiChannelSequence,
  useSaveMultiChannelSequence,
} from "@/features/campaigns/api";
import {
  getDefaultActionConfig,
  getDefaultActionType,
  getExecutionMode,
  MultiChannelStepForm,
} from "@/features/campaigns/components/multi-channel-step-form";
import { MultiChannelSequenceView } from "@/features/campaigns/components/multi-channel-sequence-view";

interface MultiChannelSequenceEditorProps {
  campaignId: string;
  campaignStatus: "DRAFTED" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";
}

export function MultiChannelSequenceEditor({
  campaignId,
  campaignStatus,
}: MultiChannelSequenceEditorProps) {
  const { data: savedSteps = [], isLoading, error } = useMultiChannelSequence(campaignId);
  const saveSequence = useSaveMultiChannelSequence();

  const [steps, setSteps] = useState<MultiChannelStep[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isDrafted = campaignStatus === "DRAFTED";
  const sortedSavedSteps = useMemo(
    () => savedSteps.slice().sort((a, b) => a.step_order - b.step_order),
    [savedSteps]
  );

  useEffect(() => {
    setSteps(sortedSavedSteps);
    setIsEditing(sortedSavedSteps.length === 0 && isDrafted);
  }, [isDrafted, sortedSavedSteps]);

  const addStep = () => {
    setMessage(null);
    const nextStep = createDefaultStep(steps.length + 1);
    setSteps((current) => [...current, nextStep]);
  };

  const save = () => {
    if (steps.length === 0) {
      setMessage("Add at least one step before saving.");
      return;
    }
    setMessage(null);
    saveSequence.mutate(
      {
        campaignId,
        steps: steps.map((step, index) => ({
          step_order: index + 1,
          channel: step.channel,
          action_type: step.action_type,
          delay_days: Math.max(0, step.delay_days),
          execution_mode: getExecutionMode(step.channel),
          action_config: step.action_config ?? {},
          skip_if: step.skip_if ?? null,
          provider_campaign_id:
            step.channel === "linkedin" ? (step.provider_campaign_id ?? null) : null,
        })),
      },
      {
        onSuccess: () => {
          setMessage("Sequence saved.");
          setIsEditing(false);
        },
        onError: () => {
          setMessage("Failed to save sequence.");
        },
      }
    );
  };

  const cancel = () => {
    setMessage(null);
    setSteps(sortedSavedSteps);
    setIsEditing(sortedSavedSteps.length === 0 && isDrafted);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-medium text-white">Sequence Steps</h3>
          {!isDrafted && (
            <p className="text-sm text-zinc-500">
              Sequence editing is only available while campaign is drafted.
            </p>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={cancel} disabled={saveSequence.isPending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saveSequence.isPending}>
              {saveSequence.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        ) : (
          isDrafted &&
          sortedSavedSteps.length > 0 && (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-400">Failed to load sequence.</p>
      ) : isLoading ? (
        <p className="text-sm text-zinc-400">Loading sequence...</p>
      ) : isEditing ? (
        <div className="space-y-4">
          {steps.length === 0 ? (
            <p className="text-sm text-zinc-400">No steps yet. Add your first step.</p>
          ) : (
            steps.map((step, index) => (
              <MultiChannelStepForm
                key={`${step.id ?? "new"}-${index}`}
                step={{
                  ...step,
                  step_order: index + 1,
                }}
                stepIndex={index}
                canMoveUp={index > 0}
                canMoveDown={index < steps.length - 1}
                onMoveUp={() =>
                  setSteps((current) => swapSteps(current, index, index - 1).map(withStepOrder))
                }
                onMoveDown={() =>
                  setSteps((current) => swapSteps(current, index, index + 1).map(withStepOrder))
                }
                onRemove={() => {
                  if (!window.confirm(`Remove step ${index + 1}?`)) {
                    return;
                  }
                  setSteps((current) =>
                    current.filter((_, stepIndex) => stepIndex !== index).map(withStepOrder)
                  );
                }}
                onChange={(nextStep) =>
                  setSteps((current) =>
                    current.map((existingStep, stepIndex) =>
                      stepIndex === index ? { ...nextStep, step_order: index + 1 } : existingStep
                    )
                  )
                }
              />
            ))
          )}
          <Button variant="secondary" onClick={addStep}>
            + Add Step
          </Button>
        </div>
      ) : (
        <MultiChannelSequenceView steps={sortedSavedSteps} />
      )}

      {message && (
        <p className={`text-sm ${message.includes("Failed") ? "text-red-400" : "text-zinc-300"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

function createDefaultStep(stepOrder: number): MultiChannelStep {
  const channel: MultiChannelStep["channel"] = "email";
  const actionType = getDefaultActionType(channel);
  return {
    step_order: stepOrder,
    channel,
    action_type: actionType,
    delay_days: 0,
    execution_mode: getExecutionMode(channel),
    action_config: getDefaultActionConfig(channel, actionType),
    skip_if: null,
    provider_campaign_id: null,
  };
}

function swapSteps(steps: MultiChannelStep[], firstIndex: number, secondIndex: number) {
  const clone = [...steps];
  const temp = clone[firstIndex];
  clone[firstIndex] = clone[secondIndex];
  clone[secondIndex] = temp;
  return clone;
}

function withStepOrder(step: MultiChannelStep, index: number): MultiChannelStep {
  return {
    ...step,
    step_order: index + 1,
  };
}

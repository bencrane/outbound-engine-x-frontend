"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCampaignSchedule,
  useCampaignSequence,
} from "@/features/campaigns/api";

interface CampaignSequenceTabProps {
  campaignId: string;
}

export function CampaignSequenceTab({ campaignId }: CampaignSequenceTabProps) {
  const { data: sequenceData, isLoading: sequenceLoading, error: sequenceError } =
    useCampaignSequence(campaignId);
  const { data: scheduleData, isLoading: scheduleLoading, error: scheduleError } =
    useCampaignSchedule(campaignId);

  const sequence = sequenceData?.sequence ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sequence</CardTitle>
          <CardDescription>Read-only campaign step sequence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sequenceError ? (
            <p className="text-sm text-red-400">Failed to load campaign sequence.</p>
          ) : sequenceLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-800 p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-3 h-4 w-64" />
                  <Skeleton className="mt-3 h-20 w-full" />
                </div>
              ))}
            </div>
          ) : sequence.length === 0 ? (
            <p className="text-sm text-zinc-400">No sequence configured</p>
          ) : (
            sequence.map((step, index) => {
              const seqNumber = getSequenceNumber(step, index);
              const delayDays = getSequenceDelayDays(step);
              const delayLabel =
                delayDays === 0
                  ? "Sent immediately"
                  : `Sent after ${delayDays} day${delayDays === 1 ? "" : "s"}`;
              const subject = getSequenceSubject(step) || "No subject";
              const body = getSequenceBody(step) || "";

              return (
                <div key={`${seqNumber}-${index}`} className="rounded-lg border border-zinc-800 p-4">
                  <p className="text-sm font-medium text-zinc-300">
                    Step {seqNumber} - {delayLabel}
                  </p>
                  <p className="mt-3 text-sm text-zinc-400">Subject:</p>
                  <p className="text-sm text-white">{subject}</p>
                  <p className="mt-3 text-sm text-zinc-400">Body:</p>
                  <div className="mt-1 whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-200">
                    <HighlightedTemplateBody body={body} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Current send schedule for this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduleError ? (
            <p className="text-sm text-red-400">Failed to load campaign schedule.</p>
          ) : scheduleLoading ? (
            <Skeleton className="h-5 w-80" />
          ) : (
            <p className="text-sm text-zinc-300">{buildScheduleSummary(scheduleData?.schedule)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HighlightedTemplateBody({ body }: { body: string }) {
  const parts = body.split(/(\{\{[^}]+\}\})/g);

  return (
    <>
      {parts.map((part, index) => {
        const isVariable = /^\{\{[^}]+\}\}$/.test(part);
        if (!isVariable) {
          return <span key={index}>{part}</span>;
        }
        return (
          <span
            key={index}
            className="rounded bg-blue-500/10 px-1 text-blue-400"
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

function getSequenceNumber(step: Record<string, unknown>, index: number): number {
  const rawValue = step.seq_number;
  if (typeof rawValue === "number") {
    return rawValue;
  }
  return index + 1;
}

function getSequenceDelayDays(step: Record<string, unknown>): number {
  const delayDetails = step.seq_delay_details;
  if (
    delayDetails &&
    typeof delayDetails === "object" &&
    "delay_in_days" in delayDetails &&
    typeof delayDetails.delay_in_days === "number"
  ) {
    return delayDetails.delay_in_days;
  }
  return 0;
}

function getSequenceSubject(step: Record<string, unknown>): string {
  return typeof step.subject === "string" ? step.subject : "";
}

function getSequenceBody(step: Record<string, unknown>): string {
  return typeof step.email_body === "string" ? step.email_body : "";
}

function buildScheduleSummary(schedule: Record<string, unknown> | undefined): string {
  if (!schedule || Object.keys(schedule).length === 0) {
    return "No schedule configured";
  }

  const dayNames: Array<{ key: string; short: string }> = [
    { key: "monday", short: "Mon" },
    { key: "tuesday", short: "Tue" },
    { key: "wednesday", short: "Wed" },
    { key: "thursday", short: "Thu" },
    { key: "friday", short: "Fri" },
    { key: "saturday", short: "Sat" },
    { key: "sunday", short: "Sun" },
  ];

  const activeDays = dayNames
    .filter((day) => schedule[day.key] === true)
    .map((day) => day.short);

  const startTime = typeof schedule.start_time === "string" ? schedule.start_time : null;
  const endTime = typeof schedule.end_time === "string" ? schedule.end_time : null;
  const timezone = typeof schedule.timezone === "string" ? schedule.timezone : null;

  const daysLabel = activeDays.length > 0 ? activeDays.join(", ") : "Custom days";
  const timeLabel =
    startTime && endTime ? `${toDisplayTime(startTime)} - ${toDisplayTime(endTime)}` : "Custom time";

  return `Schedule: ${daysLabel}, ${timeLabel}${timezone ? ` (${timezone})` : ""}`;
}

function toDisplayTime(value: string): string {
  const [hourString, minuteString = "00"] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${meridiem}`;
}

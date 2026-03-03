import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import type { components } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";

type ThreadMessage =
  | components["schemas"]["CampaignMessageResponse"]
  | components["schemas"]["OrgCampaignMessageResponse"];

interface InboxThreadMessageProps {
  message: ThreadMessage;
}

export function InboxThreadMessage({ message }: InboxThreadMessageProps) {
  const isInbound = message.direction === "inbound";
  const isOutbound = message.direction === "outbound";

  const accentClass = isInbound
    ? "border-l-2 border-emerald-500"
    : isOutbound
      ? "border-l-2 border-blue-500"
      : "border-l-2 border-zinc-600";

  const timestamp = message.sent_at ?? message.updated_at;
  const directionLabel = isInbound ? "Inbound" : isOutbound ? "Outbound" : "Unknown";

  return (
    <div className={`rounded-lg border border-zinc-800 p-4 ${accentClass}`}>
      <div className="flex items-center gap-2 text-sm text-zinc-300">
        {isInbound ? (
          <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-blue-400" />
        )}
        <span>{directionLabel}</span>
        {isOutbound && message.sequence_step_number !== null && message.sequence_step_number !== undefined && (
          <>
            <span>-</span>
            <span>Step {message.sequence_step_number}</span>
          </>
        )}
        <span>-</span>
        <span>{formatDateTime(timestamp)}</span>
      </div>

      <p className="mt-3 text-sm text-zinc-400">Subject:</p>
      <p className="text-sm text-white">{message.subject?.trim() || "No subject"}</p>

      <div className="mt-3 whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-200">
        {message.body?.trim() || "No message body"}
      </div>
    </div>
  );
}

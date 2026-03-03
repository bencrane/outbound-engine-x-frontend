import type { components } from "@/lib/api-types";
import { formatRelativeTime } from "@/lib/format";

type InboxMessage = components["schemas"]["OrgCampaignMessageResponse"];

interface InboxMessageItemProps {
  message: InboxMessage;
  selected: boolean;
  onSelect: () => void;
}

export function InboxMessageItem({
  message,
  selected,
  onSelect,
}: InboxMessageItemProps) {
  const dotColorClass =
    message.direction === "inbound"
      ? "bg-emerald-400"
      : message.direction === "outbound"
        ? "bg-blue-400"
        : "bg-zinc-500";

  const preview = message.body?.trim() ? message.body.trim().slice(0, 80) : "No message body";
  const timestamp = message.sent_at ?? message.updated_at;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-zinc-800/50 px-4 py-3 text-left transition-colors hover:bg-zinc-800/50 ${
        selected ? "bg-zinc-800" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 rounded-full ${dotColorClass}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {message.subject?.trim() || (
              <span className="text-zinc-400">No subject</span>
            )}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-400">
            {preview}
            {message.body && message.body.length > 80 ? "..." : ""}
          </p>
          <p className="mt-2 text-xs text-zinc-500">{formatRelativeTime(timestamp)}</p>
        </div>
      </div>
    </button>
  );
}

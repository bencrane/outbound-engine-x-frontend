"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCampaignReplies } from "@/features/campaigns/api";
import { formatDateTime } from "@/lib/format";

interface CampaignRepliesTabProps {
  campaignId: string;
}

export function CampaignRepliesTab({ campaignId }: CampaignRepliesTabProps) {
  const { data: replies = [], isLoading, error } = useCampaignReplies(campaignId);

  const sortedReplies = [...replies].sort((a, b) => {
    const aTime = new Date(a.sent_at ?? a.updated_at).getTime();
    const bTime = new Date(b.sent_at ?? b.updated_at).getTime();
    return bTime - aTime;
  });

  if (error) {
    return <p className="text-sm text-red-400">Failed to load campaign replies.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="rounded-lg border border-zinc-800 p-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="mt-2 h-4 w-64" />
            <Skeleton className="mt-3 h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (sortedReplies.length === 0) {
    return <p className="text-sm text-zinc-400">No replies yet</p>;
  }

  return (
    <div className="space-y-3">
      {sortedReplies.map((reply) => {
        const isInbound = reply.direction === "inbound";
        const timestamp = reply.sent_at ?? reply.updated_at;
        return (
          <div key={reply.id} className="rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              {isInbound ? (
                <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-blue-400" />
              )}
              <span>{isInbound ? "Inbound" : "Outbound"}</span>
              <span>-</span>
              <span>{formatDateTime(timestamp)}</span>
            </div>
            <p className="mt-3 text-sm text-zinc-400">Subject:</p>
            <p className="text-sm text-white">{reply.subject?.trim() || "No subject"}</p>
            <div className="mt-3 whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-200">
              {reply.body?.trim() || "No message body"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

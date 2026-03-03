import type { components } from "@/lib/api-types";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DirectionFilter,
  InboxFilters,
} from "@/features/inbox/components/inbox-filters";
import { InboxMessageItem } from "@/features/inbox/components/inbox-message-item";

type InboxMessage = components["schemas"]["OrgCampaignMessageResponse"];
type Campaign = components["schemas"]["CampaignResponse"];

interface InboxMessageListProps {
  messages: InboxMessage[];
  selectedMessageId: string | null;
  onSelectMessage: (message: InboxMessage) => void;
  direction: DirectionFilter;
  onDirectionChange: (value: DirectionFilter) => void;
  campaignId: string;
  onCampaignChange: (value: string) => void;
  campaigns: Campaign[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function InboxMessageList({
  messages,
  selectedMessageId,
  onSelectMessage,
  direction,
  onDirectionChange,
  campaignId,
  onCampaignChange,
  campaigns,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onLoadMore,
}: InboxMessageListProps) {
  return (
    <div className="flex h-full w-96 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 max-lg:w-full">
      <div className="sticky top-0 z-10">
        <InboxFilters
          direction={direction}
          onDirectionChange={onDirectionChange}
          campaignId={campaignId}
          onCampaignChange={onCampaignChange}
          campaigns={campaigns}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <p className="px-4 py-6 text-sm text-red-400">Failed to load messages.</p>
        ) : isLoading ? (
          <MessageListSkeleton />
        ) : messages.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-400">No messages found</p>
        ) : (
          <>
            {messages.map((message) => (
              <InboxMessageItem
                key={message.id}
                message={message}
                selected={selectedMessageId === message.id}
                onSelect={() => onSelectMessage(message)}
              />
            ))}

            {hasMore && (
              <div className="p-4">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MessageListSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="border-b border-zinc-800/50 px-4 py-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

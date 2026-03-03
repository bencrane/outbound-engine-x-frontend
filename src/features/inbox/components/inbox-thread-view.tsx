import { Inbox as InboxIcon, ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { InboxThreadMessage } from "@/components/shared/inbox-thread-message";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReplyThread } from "@/features/inbox/api";
import type { components } from "@/lib/api-types";

type FeedMessage = components["schemas"]["OrgCampaignMessageResponse"];
type ThreadMessage = components["schemas"]["CampaignMessageResponse"];

interface InboxThreadViewProps {
  selectedMessage: FeedMessage | null;
  threadMessages: ThreadMessage[];
  isThreadLoading: boolean;
  threadError: Error | null;
  showMobileBack: boolean;
  onMobileBack: () => void;
}

export function InboxThreadView({
  selectedMessage,
  threadMessages,
  isThreadLoading,
  threadError,
  showMobileBack,
  onMobileBack,
}: InboxThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyThreadMessageId, setReplyThreadMessageId] = useState<string | null>(null);

  const hasThread = Boolean(
    selectedMessage?.company_campaign_id && selectedMessage?.company_campaign_lead_id
  );
  const isInboundReply =
    selectedMessage?.direction === "inbound" &&
    Boolean(selectedMessage?.company_campaign_id && selectedMessage?.id);
  const showReplyThread = Boolean(selectedMessage?.id && replyThreadMessageId === selectedMessage.id);
  const replyThreadQuery = useReplyThread(
    showReplyThread ? selectedMessage?.company_campaign_id : null,
    showReplyThread ? selectedMessage?.id : null
  );
  const replyThreadMessages = useMemo(
    () => normalizeThreadMessages(replyThreadQuery.data),
    [replyThreadQuery.data]
  );
  const canUseReplyThread = showReplyThread && replyThreadMessages.length > 0;

  const orderedMessages = useMemo(() => {
    if (canUseReplyThread) {
      return [...replyThreadMessages].sort((a, b) => {
        const aTime = new Date(a.sent_at ?? a.updated_at).getTime();
        const bTime = new Date(b.sent_at ?? b.updated_at).getTime();
        return aTime - bTime;
      });
    }
    if (!hasThread || !selectedMessage) {
      return selectedMessage ? [selectedMessage] : [];
    }
    return [...threadMessages].sort((a, b) => {
      const aTime = new Date(a.sent_at ?? a.updated_at).getTime();
      const bTime = new Date(b.sent_at ?? b.updated_at).getTime();
      return aTime - bTime;
    });
  }, [canUseReplyThread, hasThread, replyThreadMessages, selectedMessage, threadMessages]);

  useEffect(() => {
    if (!selectedMessage) {
      return;
    }
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [canUseReplyThread, replyThreadMessages, selectedMessage, threadMessages]);

  if (!selectedMessage) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <InboxIcon className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-zinc-400">Select a message to view the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-6">
      {showMobileBack && (
        <Button variant="ghost" size="sm" className="mb-4" onClick={onMobileBack}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      {isInboundReply && (
        <div className="mb-3">
          {!showReplyThread ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setReplyThreadMessageId(selectedMessage.id)}
            >
              View Reply Thread
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setReplyThreadMessageId(null)}
              >
                Back to Lead Thread
              </Button>
              {replyThreadQuery.isLoading && (
                <span className="text-xs text-zinc-400">Loading reply thread...</span>
              )}
              {showReplyThread &&
                !replyThreadQuery.isLoading &&
                !replyThreadQuery.error &&
                replyThreadMessages.length === 0 && (
                  <span className="text-xs text-zinc-500">
                    No reply-thread data returned, showing lead thread.
                  </span>
                )}
              {replyThreadQuery.error && (
                <span className="text-xs text-zinc-500">
                  Reply thread unavailable, using lead thread.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {threadError ? (
        <p className="text-sm text-red-400">Failed to load conversation.</p>
      ) : isThreadLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-zinc-800 p-4">
              <Skeleton className="h-5 w-72" />
              <Skeleton className="mt-2 h-4 w-52" />
              <Skeleton className="mt-3 h-24 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {orderedMessages.map((message) => (
            <InboxThreadMessage key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeThreadMessages(data: unknown): ThreadMessage[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((item): item is ThreadMessage => {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return typeof record.id === "string";
  });
}

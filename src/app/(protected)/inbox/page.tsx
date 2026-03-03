"use client";

import { useMemo, useState } from "react";

import { RouteGuard } from "@/components/route-guard";
import { useCampaigns } from "@/features/campaigns/api";
import {
  DirectionFilter,
} from "@/features/inbox/components/inbox-filters";
import { InboxMessageList } from "@/features/inbox/components/inbox-message-list";
import { InboxThreadView } from "@/features/inbox/components/inbox-thread-view";
import { useInboxMessages, useLeadThread } from "@/features/inbox/api";
import { useAuth } from "@/lib/auth-context";
import { useCompanyContext, useCompanyFilters } from "@/lib/company-context";
import type { components } from "@/lib/api-types";

const PAGE_LIMIT = 100;

type InboxMessage = components["schemas"]["OrgCampaignMessageResponse"];

export default function InboxPage() {
  const { user } = useAuth();
  const { selectedCompany, selectedCompanyId } = useCompanyContext();
  const companyFilters = useCompanyFilters();
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [campaignId, setCampaignId] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);

  const isCompanyMember = user?.role === "company_member";

  const sharedRoleFilters = useMemo(() => {
    if (isCompanyMember) {
      return { mine_only: true };
    }
    return { ...companyFilters };
  }, [companyFilters, isCompanyMember]);

  const inboxFilters = useMemo(
    () => ({
      ...sharedRoleFilters,
      direction: direction === "all" ? null : direction,
      campaign_id: campaignId || null,
      limit: PAGE_LIMIT,
    }),
    [campaignId, direction, sharedRoleFilters]
  );

  const {
    data,
    isLoading: isMessagesLoading,
    isFetchingNextPage,
    error: messagesError,
    hasNextPage,
    fetchNextPage,
  } = useInboxMessages(inboxFilters);

  const { data: campaigns = [] } = useCampaigns(
    toCampaignScopedFilters(companyFilters)
  );

  const messages = useMemo(() => {
    const flattened = data?.pages.flatMap((page) => page) ?? [];
    if (user?.role !== "org_admin" || !selectedCompanyId) {
      return flattened;
    }
    return flattened.filter((message) => message.company_id === selectedCompanyId);
  }, [data?.pages, selectedCompanyId, user?.role]);
  const isLoadingInitial = isMessagesLoading && messages.length === 0;
  const isLoadingMore = isFetchingNextPage;
  const hasMore = Boolean(hasNextPage);

  const selectedCampaignId = selectedMessage?.company_campaign_id ?? null;
  const selectedLeadId = selectedMessage?.company_campaign_lead_id ?? null;
  const hasLeadThread = Boolean(selectedCampaignId && selectedLeadId);

  const {
    data: threadMessages = [],
    isLoading: isThreadLoading,
    error: threadError,
  } = useLeadThread(selectedCampaignId, selectedLeadId);

  return (
    <RouteGuard permission="inbox.view">
      <div className="flex h-full flex-col bg-zinc-950">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h1 className="text-2xl font-semibold text-white">Inbox</h1>
          <p className="mt-1 text-zinc-400">View and respond to replies</p>
          {user?.role === "org_admin" && (
            <p className="mt-0.5 text-sm text-zinc-500">
              Viewing: {selectedCompany?.name ?? "All Companies"}
            </p>
          )}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className={`${showMobileThread ? "hidden lg:flex" : "flex"} min-h-0`}>
            <InboxMessageList
              messages={messages}
              selectedMessageId={selectedMessage?.id ?? null}
              onSelectMessage={(message) => {
                setSelectedMessage(message);
                setShowMobileThread(true);
              }}
              direction={direction}
              onDirectionChange={(value) => {
                setDirection(value);
                setSelectedMessage(null);
                setShowMobileThread(false);
              }}
              campaignId={campaignId}
              onCampaignChange={(value) => {
                setCampaignId(value);
                setSelectedMessage(null);
                setShowMobileThread(false);
              }}
              campaigns={campaigns}
              isLoading={isLoadingInitial}
              isLoadingMore={isLoadingMore}
              error={messagesError as Error | null}
              hasMore={hasMore}
              onLoadMore={() => {
                void fetchNextPage();
              }}
            />
          </div>

          <div
            className={`${
              showMobileThread ? "flex" : "hidden lg:flex"
            } min-h-0 flex-1 bg-zinc-950`}
          >
            <InboxThreadView
              selectedMessage={selectedMessage}
              threadMessages={threadMessages}
              isThreadLoading={hasLeadThread ? isThreadLoading : false}
              threadError={hasLeadThread ? (threadError as Error | null) : null}
              showMobileBack={showMobileThread}
              onMobileBack={() => setShowMobileThread(false)}
            />
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

function toCampaignScopedFilters(filters: ReturnType<typeof useCompanyFilters>) {
  return {
    ...(filters.company_id ? { company_id: filters.company_id } : {}),
    ...(filters.mine_only !== undefined ? { mine_only: filters.mine_only } : {}),
  };
}

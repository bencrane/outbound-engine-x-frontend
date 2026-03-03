import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";

type MessageDirection = "inbound" | "outbound" | null;

export interface InboxFilters {
  direction?: MessageDirection;
  campaign_id?: string | null;
  limit?: number;
  offset?: number;
  mine_only?: boolean;
  all_companies?: boolean;
}

type FeedQuery = NonNullable<
  paths["/api/campaigns/messages"]["get"]["parameters"]["query"]
>;

export function useInboxMessages(filters?: InboxFilters) {
  const baseFilters: InboxFilters = { ...(filters ?? {}) };
  delete baseFilters.offset;

  return useInfiniteQuery({
    queryKey: ["inbox", "messages", baseFilters],
    initialPageParam: filters?.offset ?? 0,
    queryFn: async ({ pageParam }) => {
      const query: FeedQuery = {
        limit: filters?.limit ?? 100,
        offset: pageParam,
      };

      if (filters?.direction !== undefined) {
        query.direction = filters.direction;
      }
      if (filters?.campaign_id !== undefined) {
        query.campaign_id = filters.campaign_id;
      }
      if (filters?.mine_only !== undefined) {
        query.mine_only = filters.mine_only;
      }
      if (filters?.all_companies !== undefined) {
        query.all_companies = filters.all_companies;
      }

      const { data, error } = await apiClient.GET("/api/campaigns/messages", {
        params: {
          query,
        },
      });

      if (error) {
        throw new Error("Failed to fetch inbox messages.");
      }

      return data ?? [];
    },
    getNextPageParam: (lastPage, allPages) => {
      const limit = filters?.limit ?? 100;
      if (lastPage.length < limit) {
        return undefined;
      }
      return allPages.length * limit;
    },
  });
}

export function useLeadThread(campaignId?: string | null, leadId?: string | null) {
  return useQuery({
    queryKey: ["inbox", "thread", campaignId ?? "", leadId ?? ""],
    enabled: Boolean(campaignId && leadId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/campaigns/{campaign_id}/leads/{lead_id}/messages",
        {
          params: {
            path: {
              campaign_id: campaignId!,
              lead_id: leadId!,
            },
          },
        }
      );

      if (error) {
        throw new Error("Failed to load conversation thread.");
      }

      return data ?? [];
    },
  });
}

export function useReplyDetail(campaignId?: string | null, replyId?: string | null) {
  return useQuery({
    queryKey: ["inbox", "reply-detail", campaignId ?? "", replyId ?? ""],
    enabled: Boolean(campaignId && replyId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/campaigns/{campaign_id}/replies/{reply_id}",
        {
          params: {
            path: {
              campaign_id: campaignId!,
              reply_id: replyId!,
            },
          },
        }
      );
      if (error) {
        throw new Error("Failed to load reply detail.");
      }
      return data as unknown;
    },
  });
}

export function useReplyThread(campaignId?: string | null, replyId?: string | null) {
  return useQuery({
    queryKey: ["inbox", "reply-thread", campaignId ?? "", replyId ?? ""],
    enabled: Boolean(campaignId && replyId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/campaigns/{campaign_id}/replies/{reply_id}/thread",
        {
          params: {
            path: {
              campaign_id: campaignId!,
              reply_id: replyId!,
            },
          },
        }
      );
      if (error) {
        throw new Error("Failed to load reply thread.");
      }
      return data as unknown;
    },
  });
}

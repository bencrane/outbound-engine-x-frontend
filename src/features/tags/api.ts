import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";

type CreateTagBody =
  paths["/api/email-outreach/tags"]["post"]["requestBody"]["content"]["application/json"];
type DeleteTagPath =
  paths["/api/email-outreach/tags/{tag_id}"]["delete"]["parameters"]["path"];
type AttachTagsToCampaignsBody =
  paths["/api/email-outreach/tags/attach/campaigns"]["post"]["requestBody"]["content"]["application/json"];
type AttachTagsToLeadsBody =
  paths["/api/email-outreach/tags/attach/leads"]["post"]["requestBody"]["content"]["application/json"];
type AttachTagsToInboxesBody =
  paths["/api/email-outreach/tags/attach/inboxes"]["post"]["requestBody"]["content"]["application/json"];
type CreateCustomVariableBody =
  paths["/api/email-outreach/custom-variables"]["post"]["requestBody"]["content"]["application/json"];

export function useTags() {
  return useQuery({
    queryKey: ["tags", "list"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/email-outreach/tags");
      if (error) throw new Error("Failed to load tags.");
      return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTagBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/tags", { body });
      if (error) throw new Error("Failed to create tag.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tags", "list"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (path: DeleteTagPath) => {
      const { error } = await apiClient.DELETE("/api/email-outreach/tags/{tag_id}", {
        params: { path },
      });
      if (error) throw new Error("Failed to delete tag.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tags", "list"] });
    },
  });
}

export function useAttachTagsToCampaigns() {
  return useMutation({
    mutationFn: async (body: AttachTagsToCampaignsBody) => {
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/tags/attach/campaigns",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to attach tags to campaigns.");
      return data as unknown;
    },
  });
}

export function useRemoveTagsFromCampaigns() {
  return useMutation({
    mutationFn: async (body: AttachTagsToCampaignsBody) => {
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/tags/remove/campaigns",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to remove tags from campaigns.");
      return data as unknown;
    },
  });
}

export function useAttachTagsToLeads() {
  return useMutation({
    mutationFn: async (body: AttachTagsToLeadsBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/tags/attach/leads", {
        body,
      });
      if (error) throw new Error("Failed to attach tags to leads.");
      return data as unknown;
    },
  });
}

export function useRemoveTagsFromLeads() {
  return useMutation({
    mutationFn: async (body: AttachTagsToLeadsBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/tags/remove/leads", {
        body,
      });
      if (error) throw new Error("Failed to remove tags from leads.");
      return data as unknown;
    },
  });
}

export function useAttachTagsToInboxes() {
  return useMutation({
    mutationFn: async (body: AttachTagsToInboxesBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/tags/attach/inboxes", {
        body,
      });
      if (error) throw new Error("Failed to attach tags to inboxes.");
      return data as unknown;
    },
  });
}

export function useRemoveTagsFromInboxes() {
  return useMutation({
    mutationFn: async (body: AttachTagsToInboxesBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/tags/remove/inboxes", {
        body,
      });
      if (error) throw new Error("Failed to remove tags from inboxes.");
      return data as unknown;
    },
  });
}

export function useCustomVariables() {
  return useQuery({
    queryKey: ["custom-variables", "list"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/email-outreach/custom-variables");
      if (error) throw new Error("Failed to load custom variables.");
      return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    },
  });
}

export function useCreateCustomVariable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCustomVariableBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/custom-variables", {
        body,
      });
      if (error) throw new Error("Failed to create custom variable.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["custom-variables", "list"] });
    },
  });
}

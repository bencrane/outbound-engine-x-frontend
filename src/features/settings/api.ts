import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";
export { useCompanies } from "@/lib/hooks";

export type Organization =
  paths["/api/organizations/"]["get"]["responses"][200]["content"]["application/json"][number];
export type User = paths["/api/users/"]["get"]["responses"][200]["content"]["application/json"][number];
export type Company =
  paths["/api/companies/"]["get"]["responses"][200]["content"]["application/json"][number];
export type Inbox = paths["/api/inboxes/"]["get"]["responses"][200]["content"]["application/json"][number];
export type InboxSenderEmailDetail =
  paths["/api/inboxes/{inbox_id}/sender-email"]["get"]["responses"][200]["content"]["application/json"];
export type InboxWarmup =
  paths["/api/inboxes/{inbox_id}/warmup"]["post"]["responses"][200]["content"]["application/json"];
export type InboxHealthcheck =
  paths["/api/inboxes/{inbox_id}/healthcheck/mx-records"]["post"]["responses"][200]["content"]["application/json"];
export type Token = paths["/api/auth/tokens"]["get"]["responses"][200]["content"]["application/json"][number];
export type TokenCreateResponse =
  paths["/api/auth/tokens"]["post"]["responses"][201]["content"]["application/json"];

type OrganizationUpdateBody =
  paths["/api/organizations/{org_id}"]["put"]["requestBody"]["content"]["application/json"];
type CreateUserBody = paths["/api/users/"]["post"]["requestBody"]["content"]["application/json"];
type UpdateUserBody =
  paths["/api/users/{user_id}"]["put"]["requestBody"]["content"]["application/json"];
type CreateCompanyBody =
  paths["/api/companies/"]["post"]["requestBody"]["content"]["application/json"];
type UpdateCompanyBody =
  paths["/api/companies/{company_id}"]["put"]["requestBody"]["content"]["application/json"];
type CreateWebhookBody =
  paths["/api/email-outreach/webhooks"]["post"]["requestBody"]["content"]["application/json"];
type UpdateWebhookBody =
  paths["/api/email-outreach/webhooks/{webhook_id}"]["put"]["requestBody"]["content"]["application/json"];
type CreateBlocklistedEmailBody =
  paths["/api/email-outreach/blocklist/emails"]["post"]["requestBody"]["content"]["application/json"];
type CreateBlocklistedDomainBody =
  paths["/api/email-outreach/blocklist/domains"]["post"]["requestBody"]["content"]["application/json"];
type CreateTokenBody =
  paths["/api/auth/tokens"]["post"]["requestBody"]["content"]["application/json"];
type InboxSenderEmailUpdateBody =
  paths["/api/inboxes/{inbox_id}/sender-email"]["patch"]["requestBody"]["content"]["application/json"];
type InboxWarmupBody =
  paths["/api/inboxes/{inbox_id}/warmup"]["post"]["requestBody"]["content"]["application/json"];
type InboxWarmupBulkToggleBody =
  paths["/api/inboxes/warmup/enable"]["patch"]["requestBody"]["content"]["application/json"];
type InboxWarmupBulkLimitBody =
  paths["/api/inboxes/warmup/daily-limits"]["patch"]["requestBody"]["content"]["application/json"];
type MasterInboxSettingsUpdateBody =
  paths["/api/email-outreach/workspace/master-inbox-settings"]["patch"]["requestBody"]["content"]["application/json"];
type BulkCreateInboxesBody =
  paths["/api/email-outreach/inboxes/bulk/create"]["post"]["requestBody"]["content"]["application/json"];
type BulkUpdateInboxSignaturesBody =
  paths["/api/email-outreach/inboxes/bulk/signatures"]["patch"]["requestBody"]["content"]["application/json"];
type BulkUpdateInboxDailyLimitsBody =
  paths["/api/email-outreach/inboxes/bulk/daily-limits"]["patch"]["requestBody"]["content"]["application/json"];
type BulkCreateBlocklistedEmailsBody =
  paths["/api/email-outreach/blocklist/emails/bulk"]["post"]["requestBody"]["content"]["application/json"];
type BulkCreateBlocklistedDomainsBody =
  paths["/api/email-outreach/blocklist/domains/bulk"]["post"]["requestBody"]["content"]["application/json"];
type WebhookSamplePayloadBody =
  paths["/api/email-outreach/webhooks/sample-payload"]["post"]["requestBody"]["content"]["application/json"];
type WebhookTestEventBody =
  paths["/api/email-outreach/webhooks/test-event"]["post"]["requestBody"]["content"]["application/json"];

export function useOrganization() {
  return useQuery({
    queryKey: ["settings", "organization"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/organizations/");
      if (error) throw new Error("Failed to load organization.");
      return data ?? [];
    },
  });
}

export function useOrganizationById(orgId: string) {
  return useQuery({
    queryKey: ["settings", "organization", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/organizations/{org_id}", {
        params: {
          path: { org_id: orgId },
        },
      });
      if (error || !data) throw new Error("Failed to load organization.");
      return data;
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, body }: { orgId: string; body: OrganizationUpdateBody }) => {
      const { data, error } = await apiClient.PUT("/api/organizations/{org_id}", {
        params: { path: { org_id: orgId } },
        body,
      });
      if (error || !data) throw new Error("Failed to update organization.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "organization"] });
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["settings", "users"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/users/");
      if (error) throw new Error("Failed to load users.");
      return data ?? [];
    },
  });
}

export function useUserById(userId: string) {
  return useQuery({
    queryKey: ["settings", "users", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/users/{user_id}", {
        params: {
          path: { user_id: userId },
        },
      });
      if (error || !data) throw new Error("Failed to load user.");
      return data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const { data, error } = await apiClient.POST("/api/users/", { body });
      if (error || !data) throw new Error("Failed to create user.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, body }: { userId: string; body: UpdateUserBody }) => {
      const { data, error } = await apiClient.PUT("/api/users/{user_id}", {
        params: { path: { user_id: userId } },
        body,
      });
      if (error || !data) throw new Error("Failed to update user.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await apiClient.DELETE("/api/users/{user_id}", {
        params: { path: { user_id: userId } },
      });
      if (error) throw new Error("Failed to delete user.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "users"] });
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCompanyBody) => {
      const { data, error } = await apiClient.POST("/api/companies/", { body });
      if (error || !data) throw new Error("Failed to create company.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "companies"] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      body,
    }: {
      companyId: string;
      body: UpdateCompanyBody;
    }) => {
      const { data, error } = await apiClient.PUT("/api/companies/{company_id}", {
        params: {
          path: { company_id: companyId },
        },
        body,
      });
      if (error || !data) throw new Error("Failed to update company.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "companies"] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await apiClient.DELETE("/api/companies/{company_id}", {
        params: {
          path: { company_id: companyId },
        },
      });
      if (error) throw new Error("Failed to delete company.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "companies"] });
    },
  });
}

export function useEntitlements() {
  return useQuery({
    queryKey: ["settings", "entitlements"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/entitlements/");
      if (error) throw new Error("Failed to load entitlements.");
      return data ?? [];
    },
  });
}

export function useInboxes() {
  return useQuery({
    queryKey: ["settings", "inboxes"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/inboxes/");
      if (error) throw new Error("Failed to load inboxes.");
      return data ?? [];
    },
  });
}

export function useBulkCreateInboxes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkCreateInboxesBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/inboxes/bulk/create", {
        body,
      });
      if (error) throw new Error("Failed to bulk create inboxes.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "inboxes"] });
    },
  });
}

export function useBulkUpdateInboxSignatures() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkUpdateInboxSignaturesBody) => {
      const { data, error } = await apiClient.PATCH(
        "/api/email-outreach/inboxes/bulk/signatures",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to bulk update inbox signatures.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "inboxes"] });
    },
  });
}

export function useBulkUpdateInboxDailyLimits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkUpdateInboxDailyLimitsBody) => {
      const { data, error } = await apiClient.PATCH(
        "/api/email-outreach/inboxes/bulk/daily-limits",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to bulk update inbox daily limits.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "inboxes"] });
    },
  });
}

export function useInboxSenderEmail(inboxId: string) {
  return useQuery({
    queryKey: ["settings", "inboxes", inboxId, "sender-email"],
    enabled: Boolean(inboxId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/inboxes/{inbox_id}/sender-email", {
        params: {
          path: { inbox_id: inboxId },
        },
      });
      if (error || !data) throw new Error("Failed to load sender email details.");
      return data;
    },
  });
}

export function useUpdateInboxSenderEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inboxId,
      body,
    }: {
      inboxId: string;
      body: InboxSenderEmailUpdateBody;
    }) => {
      const { data, error } = await apiClient.PATCH("/api/inboxes/{inbox_id}/sender-email", {
        params: {
          path: { inbox_id: inboxId },
        },
        body,
      });
      if (error || !data) throw new Error("Failed to update sender email.");
      return data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["settings", "inboxes", variables.inboxId, "sender-email"],
        }),
        queryClient.invalidateQueries({ queryKey: ["settings", "inboxes"] }),
      ]);
    },
  });
}

export function useDeleteInboxSenderEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ inboxId }: { inboxId: string }) => {
      const { error } = await apiClient.DELETE("/api/inboxes/{inbox_id}/sender-email", {
        params: {
          path: { inbox_id: inboxId },
        },
      });
      if (error) throw new Error("Failed to delete sender email.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "inboxes"] });
    },
  });
}

export function useInboxWarmup(inboxId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["settings", "inboxes", inboxId, "warmup", startDate, endDate],
    enabled: Boolean(inboxId),
    queryFn: async () => {
      const body: InboxWarmupBody = {
        start_date: startDate,
        end_date: endDate,
      };
      const { data, error } = await apiClient.POST("/api/inboxes/{inbox_id}/warmup", {
        params: {
          path: { inbox_id: inboxId },
        },
        body,
      });
      if (error || !data) throw new Error("Failed to load warmup details.");
      return data;
    },
  });
}

export function useEnableInboxWarmup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: InboxWarmupBulkToggleBody) => {
      const { data, error } = await apiClient.PATCH("/api/inboxes/warmup/enable", {
        body,
      });
      if (error) throw new Error("Failed to enable warmup.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "inboxes"] });
    },
  });
}

export function useDisableInboxWarmup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: InboxWarmupBulkToggleBody) => {
      const { data, error } = await apiClient.PATCH("/api/inboxes/warmup/disable", {
        body,
      });
      if (error) throw new Error("Failed to disable warmup.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "inboxes"] });
    },
  });
}

export function useUpdateInboxWarmupDailyLimits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: InboxWarmupBulkLimitBody) => {
      const { data, error } = await apiClient.PATCH("/api/inboxes/warmup/daily-limits", {
        body,
      });
      if (error) throw new Error("Failed to update warmup daily limits.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "inboxes"] });
    },
  });
}

export function useInboxMxHealthcheck() {
  return useMutation({
    mutationFn: async ({ inboxId }: { inboxId: string }) => {
      const { data, error } = await apiClient.POST(
        "/api/inboxes/{inbox_id}/healthcheck/mx-records",
        {
          params: {
            path: { inbox_id: inboxId },
          },
        }
      );
      if (error || !data) throw new Error("Failed to run MX healthcheck.");
      return data;
    },
  });
}

export function useBulkMxHealthcheck() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST(
        "/api/inboxes/healthcheck/mx-records/bulk-missing"
      );
      if (error) throw new Error("Failed to run bulk MX healthcheck.");
      return data as unknown;
    },
  });
}

export function useWorkspaceAccount() {
  return useQuery({
    queryKey: ["settings", "workspace-account"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/email-outreach/workspace/account");
      if (error) throw new Error("Failed to load workspace account.");
      return data as Record<string, unknown>;
    },
  });
}

export function useMasterInboxSettings() {
  return useQuery({
    queryKey: ["settings", "master-inbox-settings"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/email-outreach/workspace/master-inbox-settings"
      );
      if (error) throw new Error("Failed to load master inbox settings.");
      return data as Record<string, unknown>;
    },
  });
}

export function useUpdateMasterInboxSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: MasterInboxSettingsUpdateBody) => {
      const { data, error } = await apiClient.PATCH(
        "/api/email-outreach/workspace/master-inbox-settings",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to update master inbox settings.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "master-inbox-settings"] });
    },
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: ["settings", "webhooks"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/email-outreach/webhooks");
      if (error) throw new Error("Failed to load webhooks.");
      return (data as Record<string, unknown>[]) ?? [];
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateWebhookBody) => {
      const { data, error } = await apiClient.POST("/api/email-outreach/webhooks", { body });
      if (error) throw new Error("Failed to create webhook.");
      return data as Record<string, unknown>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      webhookId,
      body,
    }: {
      webhookId: string;
      body: UpdateWebhookBody;
    }) => {
      const { data, error } = await apiClient.PUT(
        "/api/email-outreach/webhooks/{webhook_id}",
        {
          params: { path: { webhook_id: webhookId } },
          body,
        }
      );
      if (error) throw new Error("Failed to update webhook.");
      return data as Record<string, unknown>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (webhookId: string) => {
      const { error } = await apiClient.DELETE(
        "/api/email-outreach/webhooks/{webhook_id}",
        {
          params: { path: { webhook_id: webhookId } },
        }
      );
      if (error) throw new Error("Failed to delete webhook.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "webhooks"] });
    },
  });
}

export function useWebhookEventTypes() {
  return useQuery({
    queryKey: ["settings", "webhook-event-types"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/email-outreach/webhooks/event-types");
      if (error) throw new Error("Failed to load webhook event types.");
      return data as unknown;
    },
  });
}

export function useGetWebhook(webhookId: string) {
  return useQuery({
    queryKey: ["settings", "webhooks", webhookId],
    enabled: Boolean(webhookId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/email-outreach/webhooks/{webhook_id}",
        {
          params: {
            path: { webhook_id: webhookId },
          },
        }
      );
      if (error) throw new Error("Failed to load webhook.");
      return data as Record<string, unknown>;
    },
  });
}

export function useWebhookSamplePayload() {
  return useMutation({
    mutationFn: async (body: WebhookSamplePayloadBody) => {
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/webhooks/sample-payload",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to load sample payload.");
      return data as unknown;
    },
  });
}

export function useSendTestWebhookEvent() {
  return useMutation({
    mutationFn: async (body: WebhookTestEventBody) => {
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/webhooks/test-event",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to send test webhook event.");
      return data as unknown;
    },
  });
}

export function useBlocklistedEmails() {
  return useQuery({
    queryKey: ["settings", "blocklist", "emails"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/email-outreach/blocklist/emails");
      if (error) throw new Error("Failed to load blocked emails.");
      return data as unknown;
    },
  });
}

export function useBlocklistedDomains() {
  return useQuery({
    queryKey: ["settings", "blocklist", "domains"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/email-outreach/blocklist/domains");
      if (error) throw new Error("Failed to load blocked domains.");
      return data as unknown;
    },
  });
}

export function useCreateBlocklistedEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateBlocklistedEmailBody) => {
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/blocklist/emails",
        { body }
      );
      if (error) throw new Error("Failed to create blocked email.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "blocklist", "emails"] });
    },
  });
}

export function useBulkCreateBlocklistedEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkCreateBlocklistedEmailsBody) => {
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/blocklist/emails/bulk",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to bulk create blocked emails.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "blocklist", "emails"] });
    },
  });
}

export function useCreateBlocklistedDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateBlocklistedDomainBody) => {
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/blocklist/domains",
        { body }
      );
      if (error) throw new Error("Failed to create blocked domain.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "blocklist", "domains"] });
    },
  });
}

export function useBulkCreateBlocklistedDomains() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BulkCreateBlocklistedDomainsBody) => {
      const { data, error } = await apiClient.POST(
        "/api/email-outreach/blocklist/domains/bulk",
        {
          body,
        }
      );
      if (error) throw new Error("Failed to bulk create blocked domains.");
      return data as unknown;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "blocklist", "domains"] });
    },
  });
}

export function useDeleteBlocklistedEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE(
        "/api/email-outreach/blocklist/emails/{blacklisted_email_id}",
        {
          params: { path: { blacklisted_email_id: id } },
        }
      );
      if (error) throw new Error("Failed to delete blocked email.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "blocklist", "emails"] });
    },
  });
}

export function useDeleteBlocklistedDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE(
        "/api/email-outreach/blocklist/domains/{blacklisted_domain_id}",
        {
          params: { path: { blacklisted_domain_id: id } },
        }
      );
      if (error) throw new Error("Failed to delete blocked domain.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "blocklist", "domains"] });
    },
  });
}

export function useTokens() {
  return useQuery({
    queryKey: ["settings", "tokens"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/auth/tokens");
      if (error) throw new Error("Failed to load tokens.");
      return data ?? [];
    },
  });
}

export function useCreateToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTokenBody) => {
      const { data, error } = await apiClient.POST("/api/auth/tokens", { body });
      if (error || !data) throw new Error("Failed to create token.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "tokens"] });
    },
  });
}

export function useRevokeToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await apiClient.DELETE("/api/auth/tokens/{token_id}", {
        params: { path: { token_id: tokenId } },
      });
      if (error) throw new Error("Failed to revoke token.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "tokens"] });
    },
  });
}

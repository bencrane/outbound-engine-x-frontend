"use client";

import { RouteGuard } from "@/components/route-guard";
import { usePermission } from "@/components/gate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsApiTokensTab } from "@/features/settings/components/settings-api-tokens-tab";
import { SettingsBlocklistTab } from "@/features/settings/components/settings-blocklist-tab";
import { SettingsCompaniesTab } from "@/features/settings/components/settings-companies-tab";
import { SettingsCustomVariablesTab } from "@/features/settings/components/settings-custom-variables-tab";
import { SettingsGeneralTab } from "@/features/settings/components/settings-general-tab";
import { SettingsSenderAccountsTab } from "@/features/settings/components/settings-sender-accounts-tab";
import { SettingsTagsTab } from "@/features/settings/components/settings-tags-tab";
import { SettingsTeamTab } from "@/features/settings/components/settings-team-tab";
import { SettingsWebhooksTab } from "@/features/settings/components/settings-webhooks-tab";

export default function SettingsPage() {
  const canViewSettings = usePermission("settings.view");
  const canManageSettings = usePermission("settings.manage");
  const canManageUsers = usePermission("users.manage");
  const canManageInboxes = usePermission("inboxes.manage");

  const availableTabs = [
    {
      id: "general",
      label: "General",
      visible: canViewSettings,
      content: <SettingsGeneralTab canManage={canManageSettings} />,
    },
    {
      id: "team",
      label: "Team",
      visible: canManageUsers,
      content: <SettingsTeamTab />,
    },
    {
      id: "companies",
      label: "Companies",
      visible: canManageSettings,
      content: <SettingsCompaniesTab />,
    },
    {
      id: "sender-accounts",
      label: "Sender Accounts",
      visible: canManageInboxes,
      content: <SettingsSenderAccountsTab />,
    },
    {
      id: "webhooks",
      label: "Webhooks",
      visible: canManageSettings,
      content: <SettingsWebhooksTab />,
    },
    {
      id: "blocklist",
      label: "Blocklist",
      visible: canManageSettings,
      content: <SettingsBlocklistTab />,
    },
    {
      id: "tags",
      label: "Tags",
      visible: canManageSettings,
      content: <SettingsTagsTab />,
    },
    {
      id: "custom-variables",
      label: "Custom Variables",
      visible: canManageSettings,
      content: <SettingsCustomVariablesTab />,
    },
    {
      id: "api-tokens",
      label: "API Tokens",
      visible: canManageSettings,
      content: <SettingsApiTokensTab />,
    },
  ].filter((tab) => tab.visible);

  const defaultTab = availableTabs[0]?.id ?? "general";

  return (
    <RouteGuard permission="settings.view">
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-zinc-400">Configure your workspace</p>

        <Tabs defaultValue={defaultTab} className="mt-6">
          <TabsList>
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {availableTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </RouteGuard>
  );
}

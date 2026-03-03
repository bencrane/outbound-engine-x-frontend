export type Role = "org_admin" | "company_admin" | "company_member";

export type Permission =
  | "dashboard.view"
  | "campaigns.list"
  | "campaigns.create"
  | "campaigns.manage"
  | "inbox.view"
  | "leads.list"
  | "leads.manage"
  | "direct-mail.view"
  | "direct-mail.manage"
  | "settings.view"
  | "settings.manage"
  | "analytics.view"
  | "inboxes.manage"
  | "users.manage";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  org_admin: [
    "dashboard.view",
    "campaigns.list",
    "campaigns.create",
    "campaigns.manage",
    "inbox.view",
    "leads.list",
    "leads.manage",
    "direct-mail.view",
    "direct-mail.manage",
    "settings.view",
    "settings.manage",
    "analytics.view",
    "inboxes.manage",
    "users.manage",
  ],
  company_admin: [
    "dashboard.view",
    "campaigns.list",
    "inbox.view",
    "leads.list",
    "direct-mail.view",
    "settings.view",
    "analytics.view",
  ],
  company_member: ["inbox.view"],
};

export function isRole(value: string): value is Role {
  return value in ROLE_PERMISSIONS;
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

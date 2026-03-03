# Directive #6: Settings Page

## Context

This is the final page. Dashboard, Campaigns, Inbox, and Leads are complete. Settings is an admin-focused page with multiple sections for managing the workspace, team, sender accounts, webhooks, blocklists, and API tokens.

### Existing Infrastructure
- Tabs component (`src/components/ui/tabs.tsx`)
- Table, Input, Button, Badge, Card, Skeleton, Select, DropdownMenu — all available
- RBAC: `settings.view` to see the page, `settings.manage` for mutations, `users.manage` for team management, `inboxes.manage` for sender accounts
- `<Gate>` component and `usePermission` hook for inline permission checks
- `formatDate`, `formatDateTime`, `formatRelativeTime` utilities

---

## Settings Tabs

The page uses the `Tabs` component with these sections:

| Tab | Permission | Description |
|-----|-----------|-------------|
| General | `settings.view` | Organization info, workspace account |
| Team | `users.manage` | User list, invite users, manage roles |
| Sender Accounts | `inboxes.manage` | Email sender accounts, status, warmup |
| Webhooks | `settings.manage` | Webhook CRUD |
| Blocklist | `settings.manage` | Blocked emails and domains |
| API Tokens | `settings.manage` | Token management |

Tabs should be **filtered by permission** — users only see tabs they have access to. Use `usePermission()` to determine which tabs to render. `company_admin` (who has `settings.view` but not `settings.manage`) only sees the General tab.

---

## API Endpoints & Hooks

Create all hooks in `src/features/settings/api.ts`.

### General Tab

| Hook | Method | Endpoint | Returns |
|------|--------|----------|---------|
| `useOrganization()` | GET | `/api/organizations/` | `OrganizationResponse[]` (returns array of 1) |
| `useUpdateOrganization()` | PUT | `/api/organizations/{org_id}` | mutation |

### Team Tab

| Hook | Method | Endpoint | Returns |
|------|--------|----------|---------|
| `useUsers()` | GET | `/api/users/` | `UserResponse[]` |
| `useCreateUser()` | POST | `/api/users/` | mutation |
| `useUpdateUser()` | PUT | `/api/users/{user_id}` | mutation |
| `useDeleteUser()` | DELETE | `/api/users/{user_id}` | mutation |
| `useCompanies()` | GET | `/api/companies/` | `CompanyResponse[]` (needed for user's company assignment) |

### Sender Accounts Tab

| Hook | Method | Endpoint | Returns |
|------|--------|----------|---------|
| `useInboxes()` | GET | `/api/inboxes/` | `InboxResponse[]` |

### Webhooks Tab

| Hook | Method | Endpoint | Returns |
|------|--------|----------|---------|
| `useWebhooks()` | GET | `/api/email-outreach/webhooks` | untyped (API returns JSON) |
| `useCreateWebhook()` | POST | `/api/email-outreach/webhooks` | mutation |
| `useUpdateWebhook()` | PUT | `/api/email-outreach/webhooks/{webhook_id}` | mutation |
| `useDeleteWebhook()` | DELETE | `/api/email-outreach/webhooks/{webhook_id}` | mutation |
| `useWebhookEventTypes()` | GET | `/api/email-outreach/webhooks/event-types` | untyped |

### Blocklist Tab

| Hook | Method | Endpoint | Returns |
|------|--------|----------|---------|
| `useBlocklistedEmails()` | GET | `/api/email-outreach/blocklist/emails` | untyped |
| `useBlocklistedDomains()` | GET | `/api/email-outreach/blocklist/domains` | untyped |
| `useCreateBlocklistedEmail()` | POST | `/api/email-outreach/blocklist/emails` | mutation |
| `useCreateBlocklistedDomain()` | POST | `/api/email-outreach/blocklist/domains` | mutation |
| `useDeleteBlocklistedEmail()` | DELETE | `/api/email-outreach/blocklist/emails/{blacklisted_email_id}` | mutation |
| `useDeleteBlocklistedDomain()` | DELETE | `/api/email-outreach/blocklist/domains/{blacklisted_domain_id}` | mutation |

### API Tokens Tab

| Hook | Method | Endpoint | Returns |
|------|--------|----------|---------|
| `useTokens()` | GET | `/api/auth/tokens` | `TokenResponse[]` |
| `useCreateToken()` | POST | `/api/auth/tokens` | mutation, returns `TokenCreateResponse` (includes the actual token string — show once) |
| `useRevokeToken()` | DELETE | `/api/auth/tokens/{token_id}` | mutation |

### Mutation Patterns

All mutations should:
- Use `useMutation` from TanStack Query
- Invalidate the relevant query key on success
- Return standard `{ mutate, isPending, error }` from the hook

---

## Tab Implementations

### Tab 1: General

**Organization card** showing:
- Organization name (editable inline for `settings.manage`)
- Organization slug (read-only display)
- Created date

For `org_admin` with `settings.manage`: show an edit form (name field + Save button). Use the `useUpdateOrganization()` mutation. Show success feedback after save.

For `company_admin`: read-only display of the org info.

### Tab 2: Team

**Users table** with columns:

| Column | Field | Notes |
|--------|-------|-------|
| Name | `name_first` + `name_last` | Combined |
| Email | `email` | — |
| Role | `role` | Badge: `org_admin` = blue, `company_admin` = secondary, `company_member` = outline |
| Company | `company_id` | Map to company name from `useCompanies()` |
| Created | `created_at` | Formatted date |
| Actions | — | DropdownMenu: Edit Role, Delete |

**Invite User form** (above the table):
A compact inline form with: Email (required), First Name, Last Name, Role (select: `org_admin`, `company_admin`, `company_member`), Company (select from companies list). Submit calls `useCreateUser()`.

The password field should auto-generate a temporary password or let the admin set one. For now, include a Password field in the form.

**Edit user**: Inline role change via dropdown action → calls `useUpdateUser()` with the new role.

**Delete user**: Confirmation via a simple `window.confirm()` dialog → calls `useDeleteUser()`. Don't allow deleting yourself (compare user ID to current user from `useAuth()`).

### Tab 3: Sender Accounts

**Inboxes table** from `useInboxes()`:

| Column | Field | Notes |
|--------|-------|-------|
| Email | `email` | — |
| Display Name | `display_name` | Or "-" if null |
| Status | `status` | Badge: active = success, inactive = secondary |
| Warmup | `warmup_enabled` | Badge: enabled = success, disabled/null = outline |
| Updated | `updated_at` | Relative time |

This tab is **read-only** for now. No edit/delete actions on inboxes (those are managed via provisioning). Just a clean display so the admin can see which sender accounts are active.

### Tab 4: Webhooks

**Webhooks list**: Since the webhook responses are untyped in the OpenAPI spec, handle them as `Record<string, unknown>` and extract fields defensively. Typical webhook object has: `id`, `name`, `url`, `events` (array), `status`, `created_at`.

**Webhook table** columns: Name, URL, Events (comma-joined badges), Created.

**Create webhook form**: Name (input), URL (input), Events (multi-select from `useWebhookEventTypes()`). Since we don't have a multi-select component, use checkboxes for event selection.

**Actions**: Edit (pre-fill form), Delete (confirm dialog).

### Tab 5: Blocklist

Two sections side-by-side (or stacked):

**Blocked Emails**:
- List of blocked emails with delete buttons
- Input + "Add" button to add a new email
- Handle the response defensively (untyped)

**Blocked Domains**:
- Same pattern as emails but for domains

Keep it simple — just a list with add/remove. No bulk operations in the UI for now (the bulk endpoints exist but aren't needed yet).

### Tab 6: API Tokens

**Token table** columns:

| Column | Field | Notes |
|--------|-------|-------|
| Name | `name` | Or "Unnamed token" |
| Created | `created_at` | Formatted date |
| Expires | `expires_at` | Formatted date, or "Never" if null |
| Last Used | `last_used_at` | Relative time, or "Never" |
| Actions | — | Revoke button |

**Create token form**: Name (input), Expires at (optional date input). After creation, show the token value **once** in a highlighted code block with a copy button. Warn the user they won't see it again.

**Revoke token**: Confirmation dialog → calls `useRevokeToken()`.

---

## New UI Components

### `src/components/ui/label.tsx`

Standard form label:
- `text-sm font-medium text-zinc-300`
- Extends `ComponentProps<"label">` with `cn()`

### `src/components/ui/textarea.tsx`

Standard textarea:
- Same dark styling as Input: `bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500`
- Focus ring matches Input
- Extends `ComponentProps<"textarea">` with `cn()`

### `src/components/ui/switch.tsx`

A toggle switch for boolean settings (like webhook enable/disable):
- Simple div-based toggle with transition
- On: `bg-blue-600`. Off: `bg-zinc-600`
- Accepts `checked` and `onChange` props

---

## Feature Components

Place in `src/features/settings/components/`:

| Component | File | Purpose |
|-----------|------|---------|
| `SettingsGeneralTab` | `settings-general-tab.tsx` | Org info + edit |
| `SettingsTeamTab` | `settings-team-tab.tsx` | Users table + invite form |
| `SettingsSenderAccountsTab` | `settings-sender-accounts-tab.tsx` | Inboxes table |
| `SettingsWebhooksTab` | `settings-webhooks-tab.tsx` | Webhook CRUD |
| `SettingsBlocklistTab` | `settings-blocklist-tab.tsx` | Blocked emails/domains |
| `SettingsApiTokensTab` | `settings-api-tokens-tab.tsx` | Token management |

---

## Design Specifications

- **Page layout**: `p-8` padding. Title + tabs below.
- **Tab bar**: Same style as campaign detail (bottom border, blue active indicator).
- **Forms**: Use `Label` + `Input` pairs with `space-y-4` vertical spacing. Form sections inside `Card` components.
- **Success feedback**: After a mutation succeeds, show a brief green success message below the form (e.g., "User created successfully"). Use simple local state — no toast library needed.
- **Destructive actions**: Red text on delete buttons. `window.confirm()` for confirmation.
- **Token display**: After creation, show in a `font-mono bg-zinc-800 border border-zinc-700 p-3 rounded-md` code block with full token value. Include a "Copy" button that uses `navigator.clipboard.writeText()`.
- **Responsive**: Form inputs should be `max-w-md`. Tables should be `overflow-x-auto`.

---

## Role Behavior

- **`org_admin`**: Sees all 6 tabs. Full CRUD on everything.
- **`company_admin`**: Sees only General tab (read-only). Cannot manage team, webhooks, blocklist, tokens, or inboxes.
- **`company_member`**: Does NOT have `settings.view`. RouteGuard redirects to `/inbox`.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/label.tsx` | Form label component |
| `src/components/ui/textarea.tsx` | Textarea component |
| `src/components/ui/switch.tsx` | Toggle switch component |
| `src/features/settings/components/settings-general-tab.tsx` | General settings |
| `src/features/settings/components/settings-team-tab.tsx` | Team management |
| `src/features/settings/components/settings-sender-accounts-tab.tsx` | Sender accounts |
| `src/features/settings/components/settings-webhooks-tab.tsx` | Webhooks |
| `src/features/settings/components/settings-blocklist-tab.tsx` | Blocklist |
| `src/features/settings/components/settings-api-tokens-tab.tsx` | API tokens |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/settings/api.ts` | Replace placeholder with all settings hooks (~20 hooks) |
| `src/app/(protected)/settings/page.tsx` | Complete rewrite — tabbed settings page |

## Files NOT to Modify

Do not touch anything outside of `src/features/settings/`, `src/components/ui/`, and `src/app/(protected)/settings/`. Specifically do not touch:
- Any file in `src/lib/`
- `src/components/gate.tsx`, `src/components/route-guard.tsx`, `src/components/sidebar.tsx`, `src/components/providers.tsx`
- Any file in `src/features/campaigns/`, `src/features/inbox/`, `src/features/leads/`, `src/features/analytics/`
- Dashboard, campaigns, inbox, or leads pages

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. `/settings` shows a tabbed interface
3. Tabs are filtered by user permissions (org_admin sees all, company_admin sees General only)
4. General tab shows organization info; org_admin can edit name
5. Team tab lists all users with role badges and company assignment
6. Invite user form creates new users with role/company selection
7. Edit role and delete user actions work via dropdown menu
8. Cannot delete yourself (current user protection)
9. Sender Accounts tab shows inbox list with status/warmup badges
10. Webhooks tab supports full CRUD (list, create, edit, delete)
11. Blocklist tab allows adding/removing blocked emails and domains
12. API Tokens tab lists tokens; create shows token once with copy button
13. Revoke token works with confirmation
14. All mutations invalidate relevant queries for instant UI refresh
15. Loading/empty/error states on every tab
16. `RouteGuard` with `settings.view` preserved
17. Forms use proper Label + Input patterns with validation feedback
18. Three new UI components (Label, Textarea, Switch) follow shadcn/ui patterns

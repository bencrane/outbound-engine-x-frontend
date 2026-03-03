# Directive #10: Inbox & Sender Account Management

## Context

The Settings > Sender Accounts tab currently shows a read-only table of sender email accounts. This directive turns it into a full management panel with sender email editing, warmup controls, MX healthchecks, and workspace-level master inbox settings.

### What This Directive Enables

1. **Sender Email Detail & Edit** — view full sender config, update daily limit/name/signature
2. **Warmup Management** — enable/disable warmup, set daily limits per inbox
3. **MX Record Healthchecks** — run MX checks per inbox
4. **Master Inbox Settings** — workspace-level toggles (sync all emails, smart warmup filter, auto categorization)
5. **Workspace Account Info** — display workspace account details

### Existing Code

- `SettingsSenderAccountsTab` in `src/features/settings/components/settings-sender-accounts-tab.tsx` — read-only inbox table
- `useInboxes()` in `src/features/settings/api.ts` — fetches inbox list
- Switch component at `src/components/ui/switch.tsx` — for toggle controls
- Label, Input, Button, Badge, Card, Table, Skeleton, Textarea — all available

---

## API Endpoints to Hook

### New Hooks (add to `src/features/settings/api.ts`)

#### `useInboxSenderEmail(inboxId)`
```
GET /api/inboxes/{inbox_id}/sender-email
Returns: InboxSenderEmailDetailResponse
```
```typescript
{
  inbox_id: string
  provider: string
  sender_email: Record<string, unknown>  // provider-specific, typically has: from_email, name, daily_limit, email_signature, etc.
}
```
Query key: `["settings", "inboxes", inboxId, "sender-email"]`
Only enabled when `inboxId` is truthy.

#### `useUpdateInboxSenderEmail()`
```
PATCH /api/inboxes/{inbox_id}/sender-email
Body: { daily_limit?: number, name?: string, email_signature?: string }
Returns: InboxSenderEmailDetailResponse
```
Mutation. Invalidates `["settings", "inboxes", inboxId, "sender-email"]` and `["settings", "inboxes"]` on success.

#### `useDeleteInboxSenderEmail()`
```
DELETE /api/inboxes/{inbox_id}/sender-email
```
Mutation. Invalidates `["settings", "inboxes"]` on success.

#### `useInboxWarmup(inboxId, startDate, endDate)`
```
POST /api/inboxes/{inbox_id}/warmup
Body: { start_date: string, end_date: string }
Returns: InboxWarmupResponse
```
```typescript
{
  inbox_id: string
  provider: string
  warmup: Record<string, unknown>  // provider-specific warmup data
}
```
This is a read operation (POST because it takes a date range body). Use `useQuery` with `enabled` based on inboxId.
Query key: `["settings", "inboxes", inboxId, "warmup", startDate, endDate]`

#### `useEnableInboxWarmup()`
```
PATCH /api/inboxes/warmup/enable
Body: { inbox_ids: string[] }
```
Mutation. Invalidates `["settings", "inboxes"]` on success.

#### `useDisableInboxWarmup()`
```
PATCH /api/inboxes/warmup/disable
Body: { inbox_ids: string[] }
```
Mutation. Invalidates `["settings", "inboxes"]` on success.

#### `useUpdateInboxWarmupDailyLimits()`
```
PATCH /api/inboxes/warmup/daily-limits
Body: { inbox_ids: string[], daily_limit: number, daily_reply_limit?: number }
```
Mutation. Invalidates `["settings", "inboxes"]` on success.

#### `useInboxMxHealthcheck()`
```
POST /api/inboxes/{inbox_id}/healthcheck/mx-records
Returns: InboxHealthcheckResponse
```
```typescript
{
  inbox_id: string
  provider: string
  healthcheck: Record<string, unknown>  // provider-specific MX check results
}
```
Mutation (it triggers a check). Returns the result directly.

#### `useBulkMxHealthcheck()`
```
POST /api/inboxes/healthcheck/mx-records/bulk-missing
Returns: untyped
```
Mutation. Checks all inboxes missing MX records.

#### `useWorkspaceAccount()`
```
GET /api/email-outreach/workspace/account
Returns: untyped Record<string, unknown>
```
Query key: `["settings", "workspace-account"]`

#### `useMasterInboxSettings()`
```
GET /api/email-outreach/workspace/master-inbox-settings
Returns: untyped Record<string, unknown>
```
Query key: `["settings", "master-inbox-settings"]`

#### `useUpdateMasterInboxSettings()`
```
PATCH /api/email-outreach/workspace/master-inbox-settings
Body: { sync_all_emails?: boolean, smart_warmup_filter?: boolean, auto_interested_categorization?: boolean }
Returns: untyped
```
Mutation. Invalidates `["settings", "master-inbox-settings"]` on success.

---

## Redesign: Sender Accounts Tab

Replace the current read-only table with a full management interface. The tab becomes a mini-app with three sections:

### Section 1: Workspace Account & Master Inbox Settings

A top card showing workspace-level configuration.

```
┌──────────────────────────────────────────────────────────┐
│ Workspace Settings                                       │
│                                                          │
│ Account: [workspace account info displayed here]         │
│                                                          │
│ Master Inbox Settings:                                   │
│ [✓] Sync all emails                                     │
│ [✓] Smart warmup filter                                  │
│ [☐] Auto interested categorization                       │
│                                          [Save Settings] │
└──────────────────────────────────────────────────────────┘
```

- Workspace account info: render whatever key-value pairs come back from the untyped response. Use the humanize-key pattern from previous directives.
- Master inbox toggles: three `Switch` components for the boolean settings. Fetch current state with `useMasterInboxSettings()`, save with `useUpdateMasterInboxSettings()`.
- "Save Settings" button calls the mutation.

### Section 2: Sender Accounts Table (Enhanced)

Upgrade the existing table with new columns and row actions:

| Column | Field | Notes |
|--------|-------|-------|
| Email | `email` | — |
| Display Name | `display_name` | — |
| Status | `status` | Badge: active=success, inactive=secondary |
| Warmup | `warmup_enabled` | Badge: enabled=success, disabled=outline |
| Updated | `updated_at` | Relative time |
| Actions | — | DropdownMenu |

**Row actions dropdown** (gated by `inboxes.manage`):
- "View Details" — expands an inline detail panel below the row
- "Enable Warmup" / "Disable Warmup" — toggles warmup for that single inbox
- "Run MX Check" — triggers MX healthcheck for that inbox
- "Delete Sender Email" — destructive action with confirmation

**Bulk actions bar** — shown above the table when checkboxes are selected:
- Checkbox column on the left of each row
- "Select all" checkbox in header
- When 1+ inboxes selected, show: "Enable Warmup", "Disable Warmup", "Set Daily Limits" buttons
- "Set Daily Limits" opens an inline form with a number input

### Section 3: Inbox Detail Panel (Expandable Row)

When "View Details" is clicked, expand an inline panel below the row (same pattern as the leads page):

```
┌──────────────────────────────────────────────────────────┐
│ alice@company.com                                [Close] │
│ Provider: emailbison                                     │
│                                                          │
│ ┌─── Sender Email Config ──────────────────────────────┐ │
│ │ Display Name:  [Alice Smith_____________]            │ │
│ │ Daily Limit:   [50______]                            │ │
│ │ Signature:     [_______________________________]     │ │
│ │               [_______________________________]     │ │
│ │                                     [Save Changes]   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Warmup Details ───────────────────────────────────┐ │
│ │ [provider-specific warmup data displayed here]       │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── MX Healthcheck ──────────────────────────────────┐ │
│ │ [Run MX Check]                                       │ │
│ │ [results displayed after check runs]                 │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Sender Email Config**: Fetch with `useInboxSenderEmail(inboxId)`. The `sender_email` object is provider-specific but typically includes a `name`, `daily_limit`, and `email_signature`. Display known fields as editable inputs. Save with `useUpdateInboxSenderEmail()`.

**Warmup Details**: Fetch with `useInboxWarmup(inboxId, startDate, endDate)`. Use last 30 days as default range. Render the `warmup` object as key-value pairs (humanized keys, formatted values). This is read-only display of warmup activity.

**MX Healthcheck**: A "Run MX Check" button that calls `useInboxMxHealthcheck()`. Show results inline after the check completes. The `healthcheck` object is provider-specific — render key-value pairs. Show green badge if healthy, red if issues found.

---

## Feature Components

| Component | File | Purpose |
|-----------|------|---------|
| `WorkspaceSettingsCard` | `src/features/settings/components/workspace-settings-card.tsx` | Workspace account + master inbox settings |
| `InboxDetailPanel` | `src/features/settings/components/inbox-detail-panel.tsx` | Expandable row: sender config, warmup, healthcheck |
| `InboxBulkActions` | `src/features/settings/components/inbox-bulk-actions.tsx` | Bulk warmup/limits bar |

---

## New UI Component

### `src/components/ui/checkbox.tsx`

A styled checkbox for the table select column:
- Dark styled: custom appearance with `bg-zinc-800 border-zinc-600` unchecked, `bg-blue-600 border-blue-600` checked
- Extends `ComponentProps<"input">` with `type="checkbox"` forced
- Uses `cn()` for className merging

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/checkbox.tsx` | Checkbox component |
| `src/features/settings/components/workspace-settings-card.tsx` | Workspace + master inbox settings |
| `src/features/settings/components/inbox-detail-panel.tsx` | Inbox expandable detail |
| `src/features/settings/components/inbox-bulk-actions.tsx` | Bulk action bar |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/settings/api.ts` | Add ~12 new hooks for inbox management |
| `src/features/settings/components/settings-sender-accounts-tab.tsx` | Complete rewrite: workspace settings, enhanced table with checkboxes/actions/detail panels, bulk actions |

## Files NOT to Modify

Do not touch:
- `src/lib/` (no changes)
- `src/components/ui/` (except adding checkbox.tsx)
- `src/features/campaigns/`, `src/features/inbox/`, `src/features/leads/`, `src/features/analytics/`
- Dashboard, campaigns, inbox, leads pages
- Other settings tab components
- `src/app/(protected)/settings/page.tsx` (the tab shell — only the sender accounts tab component changes)

---

## Design Specifications

- **Workspace settings card**: `Card` with `CardHeader` + `CardContent`. Switches use the existing `Switch` component with `Label` next to each.
- **Table checkboxes**: Small checkbox in first column. Header has "select all". Selected rows get `bg-zinc-800/50` highlight.
- **Bulk actions bar**: Appears between the workspace card and table when selections exist. `flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3`. Shows count: "2 selected" + action buttons.
- **Detail panel**: Same expandable row pattern as leads page. `colSpan` full width, `bg-zinc-900/50`.
- **Sender email form**: `Label` + `Input` pairs. Signature uses `Textarea rows={3}`.
- **Warmup data**: Key-value pairs in a grid, same humanize-key pattern.
- **MX check button**: `Button variant="secondary"`. While running: disabled + "Checking...". Results: green/red badge for pass/fail + details.
- **Untyped data rendering**: All provider-specific objects (`sender_email`, `warmup`, `healthcheck`) rendered defensively with humanized keys. Skip null values. Numbers formatted, booleans as badges, strings as text.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Workspace account info displays at top of Sender Accounts tab
3. Master inbox settings toggles (sync all, smart warmup, auto categorization) work with save
4. Inbox table has checkbox column for selection
5. Bulk warmup enable/disable works for selected inboxes
6. Bulk daily limits update works with number input
7. Row dropdown has View Details, Enable/Disable Warmup, Run MX Check, Delete actions
8. View Details expands inline panel with sender email config form
9. Sender email edit (name, daily limit, signature) saves via PATCH
10. Warmup detail section shows provider warmup data
11. MX healthcheck runs and displays results inline
12. Delete sender email works with confirmation
13. All new hooks use proper query key invalidation
14. Loading/empty/error states on all sections
15. All management UI gated behind `inboxes.manage` permission
16. Checkbox component follows shadcn/ui patterns
17. No regressions to other settings tabs

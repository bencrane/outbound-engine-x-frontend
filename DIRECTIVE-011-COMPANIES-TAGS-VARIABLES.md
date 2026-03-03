# Directive #11: Company CRUD + Tags + Custom Variables + Entitlements

## Context

Settings currently has 6 tabs. This directive adds 3 new tabs (Companies, Tags, Custom Variables) and an Entitlements section to the General tab. It also hooks the tag attach/remove endpoints for use in campaigns and leads pages.

### What This Directive Enables

1. **Company CRUD** — create, edit, delete companies (sub-accounts within the org)
2. **Tags** — full tag management + ability to attach/remove tags from campaigns, leads, inboxes
3. **Custom Variables** — list and create template variables for use in email sequences (e.g. `{{company_size}}`)
4. **Entitlements** — read-only view of company entitlements (which capabilities/providers are enabled)

---

## API Endpoints to Hook

### Company CRUD (add to `src/features/settings/api.ts`)

#### `useCreateCompany()`
```
POST /api/companies/
Body: { name: string, domain?: string }
```
Mutation. Invalidates `["settings", "companies"]`.

#### `useUpdateCompany()`
```
PUT /api/companies/{company_id}
Body: { name?: string, domain?: string, status?: string }
```
Mutation. Invalidates `["settings", "companies"]`.

#### `useDeleteCompany()`
```
DELETE /api/companies/{company_id}
```
Mutation. Invalidates `["settings", "companies"]`.

### Tags (create `src/features/tags/api.ts` — new feature module)

#### `useTags()`
```
GET /api/email-outreach/tags
Returns: untyped (typically array of { id: number, name: string, default?: boolean })
```
Query key: `["tags", "list"]`

#### `useCreateTag()`
```
POST /api/email-outreach/tags
Body: { name: string, default?: boolean }
```
Mutation. Invalidates `["tags", "list"]`.

#### `useDeleteTag()`
```
DELETE /api/email-outreach/tags/{tag_id}
```
Mutation. Invalidates `["tags", "list"]`.

#### `useAttachTagsToCampaigns()`
```
POST /api/email-outreach/tags/attach/campaigns
Body: { tag_ids: number[], campaign_ids: string[], skip_webhooks?: boolean }
```
Mutation.

#### `useRemoveTagsFromCampaigns()`
```
POST /api/email-outreach/tags/remove/campaigns
Body: { tag_ids: number[], campaign_ids: string[], skip_webhooks?: boolean }
```
Mutation.

#### `useAttachTagsToLeads()`
```
POST /api/email-outreach/tags/attach/leads
Body: { tag_ids: number[], campaign_id: string, lead_ids: string[], skip_webhooks?: boolean }
```
Mutation.

#### `useRemoveTagsFromLeads()`
```
POST /api/email-outreach/tags/remove/leads
Body: { tag_ids: number[], campaign_id: string, lead_ids: string[], skip_webhooks?: boolean }
```
Mutation.

#### `useAttachTagsToInboxes()`
```
POST /api/email-outreach/tags/attach/inboxes
Body: { tag_ids: number[], inbox_ids: string[], skip_webhooks?: boolean }
```
Mutation.

#### `useRemoveTagsFromInboxes()`
```
POST /api/email-outreach/tags/remove/inboxes
Body: { tag_ids: number[], inbox_ids: string[], skip_webhooks?: boolean }
```
Mutation.

### Custom Variables (add to tags api or create separate)

#### `useCustomVariables()`
```
GET /api/email-outreach/custom-variables
Returns: untyped (typically array of { id, name, created_at })
```
Query key: `["custom-variables", "list"]`

#### `useCreateCustomVariable()`
```
POST /api/email-outreach/custom-variables
Body: { name: string }
```
Mutation. Invalidates `["custom-variables", "list"]`.

### Entitlements (add to `src/features/settings/api.ts`)

#### `useEntitlements()`
```
GET /api/entitlements/
Returns: EntitlementResponse[]
```
```typescript
{
  id: string
  company_id: string
  capability_id: string
  provider_id: string
  status: string
  provider_config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}
```
Query key: `["settings", "entitlements"]`

---

## New Settings Tabs

### Tab: Companies (`settings.manage` permission)

Company management for org_admins.

```
┌──────────────────────────────────────────────────────────┐
│ Companies                                                │
│                                                          │
│ ┌─── Create Company ───────────────────────────────────┐ │
│ │ Name*: [_______________]  Domain: [_______________]  │ │
│ │                                    [Create Company]  │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Name       │ Domain    │ Status │ Created │ Actions  │ │
│ │────────────┼───────────┼────────┼─────────┼──────────│ │
│ │ Acme Corp  │ acme.com  │ active │ Jan 15  │ [···]    │ │
│ │ Beta Inc   │ beta.io   │ active │ Feb 1   │ [···]    │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Entitlements ─────────────────────────────────────┐ │
│ │ Company     │ Capability │ Provider │ Status         │ │
│ │─────────────┼────────────┼──────────┼────────────────│ │
│ │ Acme Corp   │ email      │ emailb.  │ active         │ │
│ │ Acme Corp   │ linkedin   │ heyre.   │ active         │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Create Company form**: Name (required) + Domain (optional). Inline above the table.

**Company table columns**:
| Column | Field | Notes |
|--------|-------|-------|
| Name | `name` | — |
| Domain | `domain` | Or "-" |
| Status | `status` | Badge: active=success, other=secondary |
| Created | `created_at` | Formatted date |
| Actions | — | DropdownMenu: Edit, Delete |

**Edit action**: Opens inline edit — replace the row with input fields for name, domain, status. Save/Cancel buttons. Calls `useUpdateCompany()`.

**Delete action**: `window.confirm()` → `useDeleteCompany()`. Don't allow deleting companies that have active campaigns (warn the user, but the API will enforce this).

**Entitlements section**: Read-only table below the companies table. Shows which capabilities (email, linkedin) and providers (emailbison, heyreach) are enabled for each company. Map `company_id` to company name. Entitlements are managed via backend/super-admin — this is just visibility for the org_admin.

### Tab: Tags (`settings.manage` permission)

Tag management + attach/remove UI.

```
┌──────────────────────────────────────────────────────────┐
│ Tags                                                     │
│                                                          │
│ ┌─── Create Tag ───────────────────────────────────────┐ │
│ │ Name: [_______________]  [☐ Default]  [Create Tag]   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Tag Name     │ Default │ Actions                     │ │
│ │──────────────┼─────────┼─────────────────────────────│ │
│ │ VIP          │ no      │ [Delete]                    │ │
│ │ Warm Lead    │ yes     │ [Delete]                    │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Apply Tags ───────────────────────────────────────┐ │
│ │ Target: [Campaigns ▾]                                │ │
│ │ Tag:    [VIP ▾]                                      │ │
│ │ IDs:    [paste comma-separated IDs]                  │ │
│ │ Action: [Attach] [Remove]                            │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Create Tag form**: Name (required) + Default checkbox. Calls `useCreateTag()`.

**Tags table**: Simple list with name, default badge, delete button.

**Apply Tags section**: A utility form for attaching/removing tags in bulk:
- **Target type** select: Campaigns, Leads, Inboxes
- **Tag** select: populated from `useTags()`
- **IDs** textarea: comma-separated IDs (campaign IDs, lead IDs, or inbox IDs)
- For leads, also show a **Campaign ID** input (required by the API)
- **Attach** / **Remove** buttons: call the appropriate mutation

This is a power-user tool. The IDs can be copied from the campaigns/leads/inboxes tables.

### Tab: Custom Variables (`settings.manage` permission)

Simple list + create for template variables.

```
┌──────────────────────────────────────────────────────────┐
│ Custom Variables                                         │
│                                                          │
│ These variables can be used in email sequences as        │
│ {{variable_name}} placeholders.                          │
│                                                          │
│ ┌─── Create Variable ──────────────────────────────────┐ │
│ │ Name: [_______________]          [Create Variable]   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Variable Name                                        │ │
│ │──────────────────────────────────────────────────────│ │
│ │ company_size                                         │ │
│ │ industry                                             │ │
│ │ pain_point                                           │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Create Variable form**: Name input + create button. Variable names should be snake_case (hint in placeholder).

**Variables list**: Simple list rendering whatever fields come back. Typically just name. Show as `{{name}}` format so users know how to reference them.

**Connection to sequence editor**: Add a note/hint in the sequence editor (from Directive #9) that available variables include the custom ones. This is informational only — no code change needed to the editor since users type `{{variable_name}}` directly.

---

## Settings Page Update

Add the 3 new tabs to `src/app/(protected)/settings/page.tsx`:

| Tab | ID | Permission | Position |
|-----|----|-----------|----------|
| Companies | `companies` | `settings.manage` | After Team |
| Tags | `tags` | `settings.manage` | After Blocklist |
| Custom Variables | `custom-variables` | `settings.manage` | After Tags |

---

## Feature Folder

Create `src/features/tags/` for the tags feature module:
```
src/features/tags/
├── api.ts              — Tag + custom variable hooks
└── components/
    └── .gitkeep
```

Tags are a cross-cutting concern (used by campaigns, leads, inboxes) so they get their own feature module rather than living under settings.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/tags/api.ts` | Tag CRUD + attach/remove + custom variable hooks |
| `src/features/settings/components/settings-companies-tab.tsx` | Company CRUD + entitlements display |
| `src/features/settings/components/settings-tags-tab.tsx` | Tag management + apply tags utility |
| `src/features/settings/components/settings-custom-variables-tab.tsx` | Custom variable list + create |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/settings/api.ts` | Add company CRUD mutations + entitlements query |
| `src/app/(protected)/settings/page.tsx` | Add 3 new tabs (Companies, Tags, Custom Variables) |

## Files NOT to Modify

Do not touch:
- `src/lib/`
- `src/components/ui/`
- `src/features/campaigns/`, `src/features/inbox/`, `src/features/leads/`, `src/features/analytics/`
- Dashboard, campaigns, inbox, leads pages
- Existing settings tab components (General, Team, Sender Accounts, Webhooks, Blocklist, API Tokens)

---

## Design Specifications

- **Company edit inline**: Replace the table row with input fields when editing. Same row height. Save/Cancel buttons appear in the Actions column.
- **Entitlements table**: Read-only, below companies table. Separate `Card` with title "Entitlements". Map `company_id` to company name from the companies list.
- **Tags table**: Simple, compact. Delete button is red `variant="destructive" size="sm"`.
- **Apply Tags form**: Inside a `Card`. Target type and tag are `Select` dropdowns. IDs field is `Textarea rows={2}`. Leads section conditionally shows campaign_id `Input`. Attach = `variant="default"`, Remove = `variant="destructive"`.
- **Custom variables list**: Show each variable as `{{name}}` in a `font-mono text-blue-400` styled span, inside a simple bordered list.
- **All forms**: Inline above their respective tables, inside bordered containers. Same pattern as Team tab's invite form.
- **All tabs gated**: `settings.manage` permission. Only `org_admin` sees these.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Companies tab shows company list with create form
3. Company edit works inline with name/domain/status fields
4. Company delete works with confirmation
5. Entitlements table displays below companies with company names mapped
6. Tags tab shows tag list with create form
7. Tag delete works
8. Apply Tags utility form works for campaigns, leads, and inboxes (both attach and remove)
9. Leads target type shows campaign_id field
10. Custom Variables tab shows variable list with create form
11. Variables displayed in `{{name}}` format
12. All 3 new tabs appear in settings for `org_admin`
13. Tabs hidden for `company_admin` and `company_member`
14. Tags feature module created at `src/features/tags/`
15. All mutations invalidate correct query keys
16. Loading/empty/error states on all tabs
17. No regressions to existing settings tabs

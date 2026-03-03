# Directive #9: Campaign Creation & Configuration

## Context

The campaigns system is currently read-only. Users can view campaigns, leads, sequences, schedules, and replies — but can't create campaigns, edit sequences, modify schedules, or add leads. This directive turns the platform from a dashboard into a tool.

### What This Directive Enables

1. **Create Campaign** — email or LinkedIn, with name + company selection
2. **Sequence Editor** — add/edit/remove/reorder email steps (subject, body, delay)
3. **Schedule Editor** — configure send days, times, timezone
4. **Add Leads** — manual lead entry form + multi-lead batch add

### Existing Code to Build On

- Campaign list page already has a disabled "Create Campaign" button gated by `campaigns.create`
- Campaign detail page has read-only Sequence and Schedule tabs
- `CampaignSequenceTab` renders sequence steps as cards with `HighlightedTemplateBody`
- Schedule tab displays a text summary via `buildScheduleSummary()`
- `CampaignLeadsTab` has the leads table — needs an "Add Leads" form above it
- All relevant query keys exist in `campaignQueryKeys` object in `src/features/campaigns/api.ts`

---

## API Endpoints to Hook

### New Mutation Hooks (add to `src/features/campaigns/api.ts`)

#### `useCreateCampaign()`
```
POST /api/campaigns/
Body: { name: string, company_id?: string }
Returns: CampaignResponse
```
Invalidates `campaignQueryKeys.list()` on success. Returns the new campaign so we can navigate to its detail page.

#### `useCreateLinkedinCampaign()`
```
POST /api/linkedin/campaigns/
Body: { name: string, company_id?: string, description?: string, daily_limit?: number, delay_between_actions?: number }
Returns: LinkedinCampaignResponse
```
Invalidates `["linkedin", "campaigns"]` on success.

#### `useSaveCampaignSequence()`
```
POST /api/campaigns/{campaign_id}/sequence
Body: { sequence: Array<{ seq_number: number, subject: string, email_body: string, seq_delay_details: { delay_in_days: number } }> }
Returns: CampaignSequenceResponse
```
Invalidates `campaignQueryKeys.sequence(campaignId)` on success.

#### `useSaveCampaignSchedule()`
```
POST /api/campaigns/{campaign_id}/schedule
Body: { monday: boolean, tuesday: boolean, ..., sunday: boolean, start_time: string, end_time: string, timezone: string, save_as_template?: boolean }
Returns: CampaignScheduleResponse
```
Invalidates `campaignQueryKeys.schedule(campaignId)` on success.

#### `useAddCampaignLeads()`
```
POST /api/campaigns/{campaign_id}/leads
Body: { leads: Array<{ email: string, first_name?: string, last_name?: string, linkedin_url?: string, company?: string, title?: string, phone?: string }> }
Returns: CampaignLeadMutationResponse { campaign_id, affected, status }
```
Invalidates `campaignQueryKeys.leads(campaignId)` on success.

#### `useAddLinkedinCampaignLeads()`
```
POST /api/linkedin/campaigns/{campaign_id}/leads
Body: { leads: Array<LeadCreateInput> }
Returns: CampaignLeadMutationResponse
```
Invalidates `["linkedin", campaignId, "leads"]` on success.

---

## Feature 1: Create Campaign Dialog

### Trigger

The "Create Campaign" button on `/campaigns` (currently disabled). Make it functional:
- Opens a dialog/modal for campaign creation
- Gated behind `campaigns.create` permission (already gated via `<Gate>`)

### New UI Component: `src/components/ui/dialog.tsx`

A simple modal dialog:
- `Dialog` — wrapper managing open/close state
- `DialogTrigger` — element that opens the dialog
- `DialogContent` — centered overlay panel with backdrop
- `DialogHeader` — title area
- `DialogTitle` — heading
- `DialogDescription` — subtitle
- `DialogFooter` — action buttons area

Implementation: Use a simple `useState` for open/close. Render a fixed overlay with `bg-black/50` backdrop. Content centered with `max-w-lg`. Close on backdrop click and Escape key. No portal needed — just render inline.

Dark styled: `bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl`

### Create Campaign Form

Inside the dialog:

**Step 1: Choose channel**
Two large selectable cards:
- "Email Campaign" — with Mail icon
- "LinkedIn Campaign" — with Linkedin icon

Clicking one selects it (highlighted border). This determines which create API to call.

**Step 2: Campaign details**
- **Name** (required) — `Input`
- **Company** (optional) — `Select` populated from `useCompanies()`. For `org_admin`, this is important since they manage multiple companies. For `company_admin`, auto-select their company.

For LinkedIn campaigns, also show:
- **Description** (optional) — `Textarea`
- **Daily Limit** (optional) — `Input` type="number"
- **Delay Between Actions** (optional) — `Input` type="number" (seconds)

**Submit**: Calls `useCreateCampaign()` or `useCreateLinkedinCampaign()`. On success:
1. Close the dialog
2. Navigate to `/campaigns/{newCampaign.id}?channel={email|linkedin}`

Show loading state on the button while mutation is pending. Show error inline if it fails.

### Component

Create `src/features/campaigns/components/create-campaign-dialog.tsx`

---

## Feature 2: Sequence Editor

### Transform the Sequence Tab from Read-Only to Editable

Currently `CampaignSequenceTab` displays steps as read-only cards. Make it editable for users with `campaigns.manage` permission.

### Behavior

- **View mode** (default, or if user lacks `campaigns.manage`): Current read-only display. No changes.
- **Edit mode** (user clicks "Edit Sequence" button, gated by `campaigns.manage`): Form-based editor.

### Edit Mode UI

Replace the read-only cards with editable step forms:

```
┌──────────────────────────────────────────────────────────┐
│ Sequence Steps                          [Save] [Cancel]  │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Step 1                              [↑] [↓] [✕]     │ │
│ │                                                      │ │
│ │ Delay: [0] days                                      │ │
│ │ Subject: [________________________________]          │ │
│ │ Body:                                                │ │
│ │ [                                                  ] │ │
│ │ [                                                  ] │ │
│ │ [                                                  ] │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Step 2                              [↑] [↓] [✕]     │ │
│ │ ...                                                  │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [+ Add Step]                                             │
└──────────────────────────────────────────────────────────┘
```

Each step has:
- **Step number** — auto-calculated from position (1-indexed)
- **Delay in days** — `Input type="number"` (0 = sent immediately)
- **Subject** — `Input`
- **Email body** — `Textarea` (tall, ~6 rows). Template variables like `{{first_name}}` can be typed directly.
- **Reorder buttons** — Up/Down arrows to swap with adjacent steps
- **Remove button** — X to delete the step (confirm if it's the only step)

**Add Step** button appends a new empty step at the end.

**Save** — serializes all steps into the `CampaignSequenceUpsertRequest` format:
```json
{
  "sequence": [
    {
      "seq_number": 1,
      "subject": "Quick question",
      "email_body": "Hi {{first_name}}, ...",
      "seq_delay_details": { "delay_in_days": 0 }
    },
    ...
  ]
}
```
Calls `useSaveCampaignSequence()`. On success, exit edit mode and show the updated read-only view.

**Cancel** — discards changes and returns to read-only view.

### State Management

Use local component state for the edit form. On entering edit mode, copy the current sequence data into a `steps` state array. Edits mutate this local state. Only on Save does it hit the API.

```typescript
interface EditableStep {
  subject: string;
  email_body: string;
  delay_in_days: number;
}
```

### Component

Create `src/features/campaigns/components/sequence-editor.tsx` — the edit mode form. The existing `CampaignSequenceTab` toggles between this and the read-only view.

---

## Feature 3: Schedule Editor

### Transform the Schedule Display from Read-Only to Editable

Currently the schedule is a text summary. Make it an editable form.

### Edit Mode UI

```
┌──────────────────────────────────────────────────────────┐
│ Schedule                                [Save] [Cancel]  │
│                                                          │
│ Send Days:                                               │
│ [✓ Mon] [✓ Tue] [✓ Wed] [✓ Thu] [✓ Fri] [☐ Sat] [☐ Sun]│
│                                                          │
│ Send Window:                                             │
│ From: [09:00]  To: [17:00]                               │
│                                                          │
│ Timezone: [America/New_York ▾]                           │
└──────────────────────────────────────────────────────────┘
```

- **Day toggles** — 7 toggle buttons (use `Button` variant switching). Active = `variant="default"`, inactive = `variant="secondary"`.
- **Start time / End time** — `Input type="time"`
- **Timezone** — `Select` with common timezones. Hardcode a reasonable list:
  - America/New_York, America/Chicago, America/Denver, America/Los_Angeles
  - Europe/London, Europe/Paris, Europe/Berlin
  - Asia/Tokyo, Asia/Shanghai, Australia/Sydney
  - UTC

**Save** — calls `useSaveCampaignSchedule()`. **Cancel** — discards.

### Component

Create `src/features/campaigns/components/schedule-editor.tsx`. The `CampaignSequenceTab` (which already shows the schedule) toggles between read-only and edit mode.

---

## Feature 4: Add Leads Form

### Add to the Leads Tab

Add an "Add Leads" section above the leads table in `CampaignLeadsTab` (for email) and `LinkedinLeadsTab` (for LinkedIn). Gated behind `campaigns.manage`.

### UI

A collapsible form (default collapsed, expand via "Add Leads" button):

```
┌──────────────────────────────────────────────────────────┐
│ Add Leads                                        [Close] │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Email*        First Name   Last Name   Company Title │ │
│ │ [___________] [_________] [________] [______] [____] │ │
│ │                                          [+ Add Row] │ │
│ │ [___________] [_________] [________] [______] [____] │ │
│ │                                                      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [Add 2 Leads]                                            │
└──────────────────────────────────────────────────────────┘
```

- Start with 1 empty row
- "Add Row" button adds another empty row
- Each row: Email (required), First Name, Last Name, Company, Title
- For LinkedIn leads, also include LinkedIn URL field
- Remove row button (X) on each row (if more than 1 row)
- Submit button shows count: "Add N Leads"
- On success: collapse the form, show success message, table refreshes via query invalidation

### Component

Create `src/features/campaigns/components/add-leads-form.tsx` — a shared component used by both email and LinkedIn leads tabs. Takes a `channel` prop and `campaignId` to determine which mutation to call.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/dialog.tsx` | Modal dialog component |
| `src/features/campaigns/components/create-campaign-dialog.tsx` | Campaign creation flow |
| `src/features/campaigns/components/sequence-editor.tsx` | Sequence step editor |
| `src/features/campaigns/components/schedule-editor.tsx` | Schedule editor |
| `src/features/campaigns/components/add-leads-form.tsx` | Multi-row lead entry form |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/campaigns/api.ts` | Add 6 new mutation hooks |
| `src/app/(protected)/campaigns/page.tsx` | Wire up Create Campaign dialog to the button |
| `src/features/campaigns/components/campaign-sequence-tab.tsx` | Add edit mode toggle, integrate SequenceEditor and ScheduleEditor |
| `src/features/campaigns/components/campaign-leads-tab.tsx` | Add AddLeadsForm above leads table |
| `src/features/campaigns/components/linkedin-leads-tab.tsx` | Add AddLeadsForm above leads table |

## Files NOT to Modify

Do not touch:
- `src/lib/` (no changes)
- `src/components/ui/` (except adding dialog.tsx)
- `src/features/analytics/`, `src/features/inbox/`, `src/features/leads/`, `src/features/settings/`
- Dashboard, inbox, leads, settings pages
- `src/app/(protected)/campaigns/[id]/page.tsx` (the detail page shell — only tab components change)
- Campaign overview tab, replies tab, status badge, lead status badge

---

## Design Specifications

- **Dialog**: Centered, `max-w-lg`, dark overlay `bg-black/50`. Close with X button, backdrop click, or Escape.
- **Channel selection cards**: `p-6 border-2 rounded-lg cursor-pointer`. Selected: `border-blue-500 bg-blue-500/5`. Unselected: `border-zinc-700 hover:border-zinc-600`.
- **Sequence editor step cards**: `border border-zinc-800 rounded-lg p-4 space-y-3`. Use `Textarea` with `rows={6}` for body.
- **Reorder buttons**: `Button variant="ghost" size="icon"` with `ChevronUp`/`ChevronDown` icons.
- **Schedule day toggles**: Row of 7 `Button` components, `size="sm"`. Active day = `variant="default"`. Inactive = `variant="outline"`.
- **Time inputs**: `Input type="time"` with dark styling.
- **Add leads table**: Grid layout using `Input` components. Compact `size="sm"` styling. Each row is a flex row of inputs.
- **Success feedback**: Green text messages after successful mutations.
- **Loading states**: Disable submit buttons and show "Saving..." text while mutations are pending.

---

## Role Behavior

- **`org_admin`**: Full access — create campaigns for any company, edit all sequences/schedules, add leads everywhere.
- **`company_admin`**: Can view but cannot create or edit (lacks `campaigns.create` and `campaigns.manage`). All edit UI is hidden via `usePermission` checks.
- **`company_member`**: Cannot access campaigns page at all.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. "Create Campaign" button opens a dialog with channel selection + name/company form
3. Email campaign creation calls `POST /api/campaigns/` and navigates to the new campaign
4. LinkedIn campaign creation calls `POST /api/linkedin/campaigns/` with extra fields
5. Sequence tab has "Edit Sequence" button (gated by `campaigns.manage`)
6. Sequence editor allows adding, editing, removing, and reordering steps
7. Save sequence calls `POST /api/campaigns/{id}/sequence` and returns to read-only view
8. Schedule editor shows day toggles, time inputs, and timezone select
9. Save schedule calls `POST /api/campaigns/{id}/schedule`
10. "Add Leads" form appears on both email and LinkedIn leads tabs
11. Multi-row lead entry with add/remove rows
12. Submit calls the correct API (email or LinkedIn) and refreshes the leads table
13. All edit UI is hidden for users without `campaigns.manage`
14. Dialog component follows shadcn/ui patterns (dark theme, cn(), data-slot)
15. Cancel discards changes without API calls
16. Error states shown inline on mutation failures
17. No regressions to existing read-only campaign views

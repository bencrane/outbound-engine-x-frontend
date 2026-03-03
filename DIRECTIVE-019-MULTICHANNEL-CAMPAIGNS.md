# Directive #19: Multi-Channel Campaign Builder

## Context

This is a Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 frontend. The backend has added **orchestrated multi-channel campaigns** — a campaign can now contain a sequence of steps across email, LinkedIn, direct mail, and voicemail, executed in order with delays and skip conditions.

Existing single-channel campaign functionality is unchanged. The `GET /api/campaigns` response now includes two new fields:
- `campaign_type`: `"single_channel"` (existing) or `"multi_channel"` (new)
- `provider_id`: now nullable — `null` for multi-channel campaigns

### Existing Code

- Campaign create dialog at `src/features/campaigns/components/create-campaign-dialog.tsx` — currently handles email + LinkedIn single-channel creation with a channel card selector
- Campaign detail page at `src/app/(protected)/campaigns/[id]/page.tsx` — uses `?channel=email|linkedin` query param to determine API calls
- Campaign list at `src/app/(protected)/campaigns/page.tsx` — unified email + LinkedIn list with channel badge
- All campaign API hooks in `src/features/campaigns/api.ts`
- UI components: Dialog, Tabs, Table, Card, Badge, Button, Input, Textarea, Select, Label, DropdownMenu

### New Backend Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/campaigns/multi-channel` | Create multi-channel campaign |
| `PUT` | `/api/campaigns/{id}/multi-channel-sequence` | Define/replace sequence steps |
| `GET` | `/api/campaigns/{id}/multi-channel-sequence` | Get sequence steps |
| `POST` | `/api/campaigns/{id}/multi-channel-leads` | Add leads (with optional inline step content) |
| `POST` | `/api/campaigns/{id}/activate` | Activate campaign |
| `GET` | `/api/campaigns/{id}/lead-progress` | View all lead progress |
| `GET` | `/api/campaigns/{id}/leads/{lead_id}/progress` | Single lead progress |

(AI personalization endpoints — `PUT/GET .../step-content` — will be handled in a future directive.)

---

## New API Hooks

Add to `src/features/campaigns/api.ts`:

### `useCreateMultiChannelCampaign()`
```
POST /api/campaigns/multi-channel
Body: { campaign_type: "multi_channel", company_id: string, name: string }
Returns: CampaignResponse (with campaign_type: "multi_channel")
```
Mutation. Invalidates campaign list queries on success.

### `useMultiChannelSequence(campaignId)`
```
GET /api/campaigns/{campaign_id}/multi-channel-sequence
Returns: Array of step objects (see schema below)
```
Query key: `["campaigns", campaignId, "multi-channel-sequence"]`

### `useSaveMultiChannelSequence()`
```
PUT /api/campaigns/{campaign_id}/multi-channel-sequence
Body: { steps: Array<StepDefinition> }
Returns: Array of created steps with server IDs
```
Mutation. Invalidates `["campaigns", campaignId, "multi-channel-sequence"]`.

### `useAddMultiChannelLeads()`
```
POST /api/campaigns/{campaign_id}/multi-channel-leads
Body: { leads: Array<{ email, first_name?, last_name?, company?, title?, phone?, step_content? }> }
Returns: { campaign_id, affected, status }
```
Mutation. Invalidates campaign lead queries.

### `useActivateCampaign()`
```
POST /api/campaigns/{campaign_id}/activate
No body.
Returns: { campaign_id, status: "ACTIVE", leads_initialized, first_step_order, first_execute_at }
```
Mutation. Invalidates campaign detail + list queries.

### `useLeadProgress(campaignId, filters?)`
```
GET /api/campaigns/{campaign_id}/lead-progress
Query params: step_status? (optional filter)
Returns: Array of lead progress objects
```
Query key: `["campaigns", campaignId, "lead-progress", filters]`

### `useSingleLeadProgress(campaignId, leadId)`
```
GET /api/campaigns/{campaign_id}/leads/{lead_id}/progress
Returns: Single lead progress object
```
Query key: `["campaigns", campaignId, "leads", leadId, "progress"]`
Enabled only when both IDs are truthy.

### Step Schema

Each step in the sequence:
```typescript
interface MultiChannelStep {
  id?: string;                    // server-generated (present on GET, absent on PUT)
  step_order: number;             // 1-indexed, unique
  channel: "email" | "linkedin" | "direct_mail" | "voicemail";
  action_type: string;            // "send_email" | "send_connection_request" | "send_linkedin_message" | "send_postcard" | "send_letter" | "send_voicemail"
  delay_days: number;             // >= 0
  execution_mode: string;         // "direct_single_touch" | "campaign_mediated"
  action_config: Record<string, unknown>;  // channel-specific payload
  skip_if?: { event?: string; direction?: string; lead_status?: string } | null;
  provider_campaign_id?: string | null;    // only for campaign_mediated (LinkedIn)
  provider_id?: string | null;             // server-populated
  created_at?: string;
  updated_at?: string;
}
```

### Lead Progress Schema
```typescript
interface LeadProgress {
  id: string;
  lead_id: string;
  current_step_order: number;
  step_status: "pending" | "executing" | "executed" | "skipped" | "failed" | "completed";
  next_execute_at: string | null;
  executed_at: string | null;
  completed_at: string | null;
  attempts: number;
  last_error: string | null;
}
```

---

## Feature 1: Update Campaign List

### Campaign Type Badge

The campaign list already shows channel badges (Email/LinkedIn). Now add a **campaign type indicator**:
- `single_channel` campaigns: show the existing channel badge (Email or LinkedIn)
- `multi_channel` campaigns: show a "Multi-Channel" badge with `variant="default"` and a `Layers` icon from lucide-react

Update `src/app/(protected)/campaigns/page.tsx`:
- The `UnifiedCampaign` type needs a new field: `campaignType: "single_channel" | "multi_channel"`
- Populate from the API response's `campaign_type` field
- For LinkedIn campaigns (fetched from separate endpoint), set `campaignType: "single_channel"`
- Multi-channel campaigns come from `GET /api/campaigns/` with `campaign_type: "multi_channel"` — they should route to `/campaigns/{id}?channel=multi`

### Add Channel Filter Option

Add "Multi-Channel" to the existing channel filter button group (All / Email / LinkedIn / **Multi-Channel**).

---

## Feature 2: Update Create Campaign Dialog

### Add Multi-Channel Option

Update `src/features/campaigns/components/create-campaign-dialog.tsx`:

Add a third channel card alongside Email and LinkedIn:

```
┌─────────────┐  ┌─────────────┐  ┌───────────────┐
│  📧 Email   │  │ 🔗 LinkedIn │  │ 🔀 Multi-Ch.  │
│  Campaign   │  │  Campaign   │  │  Campaign      │
└─────────────┘  └─────────────┘  └───────────────┘
```

Use `Layers` icon from lucide-react for multi-channel.

When "Multi-Channel" is selected:
- Show only Name + Company fields (no channel-specific fields)
- Submit calls `useCreateMultiChannelCampaign()`
- On success: navigate to `/campaigns/{id}?channel=multi` (the new campaign's detail page where the user designs the sequence)

---

## Feature 3: Multi-Channel Campaign Detail Page

### Channel-Aware Routing

Update `src/app/(protected)/campaigns/[id]/page.tsx`:

When `channel=multi`:
- Fetch campaign via `useCampaign(campaignId)` (same endpoint, but `campaign_type` will be `"multi_channel"`)
- Show different tabs than single-channel campaigns

### Tab Structure for Multi-Channel

| Tab | Content |
|-----|---------|
| Sequence | Multi-channel sequence designer (THE core UI) |
| Leads | Lead management (add leads, view list) |
| Progress | Lead progress dashboard (after activation) |
| Overview | Campaign analytics summary (reuse existing) |

Default tab: **Sequence** (this is where the user spends most time building).

### Status Actions for Multi-Channel

- DRAFTED → "Activate" button (calls `useActivateCampaign()`, only if sequence + leads exist)
- ACTIVE → "Pause" / "Stop"
- PAUSED → "Resume" / "Stop"

The "Activate" button is special — it's not just a status change, it initializes lead progress.

---

## Feature 4: Multi-Channel Sequence Designer

This is the core UI. Create `src/features/campaigns/components/multi-channel-sequence-editor.tsx`.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Sequence Steps                              [Save] [Cancel]  │
│                                                              │
│ ┌──── Step 1 ────────────────────────────── [↑] [↓] [✕] ──┐ │
│ │ Channel: [Email ▾]    Action: [Send Email ▾]             │ │
│ │ Delay: [0] days after previous step                      │ │
│ │ Skip if: [None ▾]                                        │ │
│ │                                                          │ │
│ │ ┌── Email Config ──────────────────────────────────────┐ │ │
│ │ │ Subject: [________________________________]          │ │ │
│ │ │ Message: [                                         ] │ │ │
│ │ │          [                                         ] │ │ │
│ │ │ Sender Email ID: [___]                              │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌──── Step 2 ────────────────────────────── [↑] [↓] [✕] ──┐ │
│ │ Channel: [LinkedIn ▾]  Action: [Connection Request ▾]    │ │
│ │ Delay: [3] days       Skip if: [Reply Received ▾]        │ │
│ │                                                          │ │
│ │ ┌── LinkedIn Config ───────────────────────────────────┐ │ │
│ │ │ Message: [________________________________]          │ │ │
│ │ │ Provider Campaign ID: [_______________] (optional)   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                              │
│ [+ Add Step]                                                 │
└──────────────────────────────────────────────────────────────┘
```

### Step Configuration

Each step has common fields + channel-specific config:

**Common fields:**
- **Channel** — `Select`: Email, LinkedIn, Direct Mail, Voicemail
- **Action Type** — `Select`, options depend on channel:
  - Email: `send_email`
  - LinkedIn: `send_connection_request`, `send_linkedin_message`
  - Direct Mail: `send_postcard`, `send_letter`
  - Voicemail: `send_voicemail`
- **Delay Days** — `Input type="number"`, min 0. Label: "X days after previous step"
- **Skip If** — `Select`: None, Reply Received, Inbound Message Received, Lead Unsubscribed
- **Execution Mode** — auto-set based on channel: `campaign_mediated` for LinkedIn, `direct_single_touch` for everything else. Don't expose to user unless needed.

**Channel-specific action_config:**

**Email** (`send_email`):
- Subject — `Input`
- Message — `Textarea` (HTML content, rows=6)
- Sender Email ID — `Input type="number"` (optional, references an inbox ID)

**LinkedIn** (`send_connection_request` / `send_linkedin_message`):
- Message — `Textarea` (rows=3)
- Provider Campaign ID — `Input` (optional, for `campaign_mediated` mode)

**Direct Mail** (`send_postcard` / `send_letter`):
- Description — `Input`
- Front template — `Input` (template ID or URL)
- Back template — `Input` (for postcards)
- File — `Input` (for letters, template URL)
- To address fields — show as note: "Address pulled from lead data"

**Voicemail** (`send_voicemail`):
- Voice Clone ID — `Input`
- Script — `Textarea` (rows=4)
- From Number — `Input`
- OR: Recording URL — `Input` (alternative to clone+script)

### Step Management

- **Add Step** — appends a new empty step at the end
- **Remove Step** — X button with confirmation. Renumbers remaining steps.
- **Reorder** — Up/Down arrows swap adjacent steps. Renumbers automatically.
- **Save** — serializes all steps into `{ steps: [...] }` format and calls `useSaveMultiChannelSequence()`. Calculates `step_order` from array position (1-indexed).
- **Cancel** — discards changes, reverts to last saved state

### View Mode vs Edit Mode

- If sequence exists (GET returns steps): show read-only view by default, "Edit" button to enter edit mode
- If no sequence: show editor immediately
- Read-only view: render each step as a card (similar to existing email sequence tab) showing channel icon, action type, delay, skip condition, and a summary of the config
- Campaign must be `DRAFTED` to edit sequence. If not DRAFTED, hide the Edit button and show a note.

---

## Feature 5: Multi-Channel Leads Tab

Create `src/features/campaigns/components/multi-channel-leads-tab.tsx`.

Similar to the existing `CampaignLeadsTab` but uses the multi-channel leads endpoint:

- Fetch leads with existing `useCampaignLeads(campaignId)` (same endpoint works for multi-channel campaigns)
- Show the same table: Name, Email, Company, Title, Status, Actions
- **Add Leads section**: reuse the `AddLeadsForm` pattern (from D9) but call `useAddMultiChannelLeads()` instead. Include `phone` field (needed for voicemail steps).
- Actions: same pause/resume/unsubscribe as single-channel leads

---

## Feature 6: Lead Progress Dashboard

Create `src/features/campaigns/components/lead-progress-tab.tsx`.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Lead Progress                                                │
│ [Filter: All ▾] [Pending ▾] [Executing ▾] [Completed ▾]    │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Lead      │ Step │ Status    │ Next Execute │ Last Error │ │
│ │───────────┼──────┼───────────┼──────────────┼────────────│ │
│ │ Alice S.  │ 2    │ pending   │ Mar 6, 2:30p │ -          │ │
│ │ Bob J.    │ 1    │ executed  │ -            │ -          │ │
│ │ Carol M.  │ 3    │ failed    │ -            │ API timeout│ │
│ │ Dave L.   │ 3    │ completed │ -            │ -          │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Table columns:**
| Column | Field | Notes |
|--------|-------|-------|
| Lead | `lead_id` | Need to cross-reference with leads list to show name |
| Current Step | `current_step_order` | Show as "Step N" with the channel icon from the sequence |
| Status | `step_status` | Badge: pending=outline, executing=warning, executed=success, skipped=secondary, failed=destructive, completed=default |
| Next Execute | `next_execute_at` | Formatted datetime |
| Executed At | `executed_at` | Formatted datetime |
| Attempts | `attempts` | Number |
| Last Error | `last_error` | Red text if present, "-" otherwise |

**Status filter**: Button group for `step_status` values.

**Click to expand**: Clicking a row fetches `useSingleLeadProgress(campaignId, leadId)` for additional detail in an expandable panel.

---

## Feature Components

| Component | File |
|-----------|------|
| `MultiChannelSequenceEditor` | `src/features/campaigns/components/multi-channel-sequence-editor.tsx` |
| `MultiChannelSequenceView` | `src/features/campaigns/components/multi-channel-sequence-view.tsx` |
| `MultiChannelStepForm` | `src/features/campaigns/components/multi-channel-step-form.tsx` |
| `MultiChannelLeadsTab` | `src/features/campaigns/components/multi-channel-leads-tab.tsx` |
| `LeadProgressTab` | `src/features/campaigns/components/lead-progress-tab.tsx` |
| `StepProgressBadge` | `src/features/campaigns/components/step-progress-badge.tsx` |
| `ChannelIcon` | `src/features/campaigns/components/channel-icon.tsx` |

`ChannelIcon` — small utility component that renders the appropriate lucide icon for a channel:
- email → `Mail`
- linkedin → `Linkedin`
- direct_mail → `Mail` (or `FileText`)
- voicemail → `Phone`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/campaigns/components/multi-channel-sequence-editor.tsx` | Sequence editor (edit mode) |
| `src/features/campaigns/components/multi-channel-sequence-view.tsx` | Sequence read-only view |
| `src/features/campaigns/components/multi-channel-step-form.tsx` | Per-step configuration form |
| `src/features/campaigns/components/multi-channel-leads-tab.tsx` | Leads tab for multi-channel |
| `src/features/campaigns/components/lead-progress-tab.tsx` | Progress dashboard |
| `src/features/campaigns/components/step-progress-badge.tsx` | Progress status badge |
| `src/features/campaigns/components/channel-icon.tsx` | Channel → icon mapping |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/campaigns/api.ts` | Add 7 new hooks |
| `src/app/(protected)/campaigns/page.tsx` | Add multi-channel badge, channel filter option, route with `?channel=multi` |
| `src/app/(protected)/campaigns/[id]/page.tsx` | Handle `channel=multi` with different tabs + activate button |
| `src/features/campaigns/components/create-campaign-dialog.tsx` | Add multi-channel card option + mutation |

## Files NOT to Modify

Do not touch: `src/lib/`, `src/components/`, existing single-channel tab components, dashboard, inbox, leads, settings, direct mail pages.

---

## Design Specifications

- **Multi-channel badge**: `variant="default"` with `Layers` icon. Text: "Multi-Channel".
- **Step cards in editor**: `border border-zinc-800 rounded-lg p-4 space-y-4`. Each step has a header row with step number + channel icon + action type + reorder/delete buttons.
- **Channel selector in step**: Color-coded options. Email=blue, LinkedIn=zinc, Direct Mail=emerald, Voicemail=purple. Use colored dots or the channel icon.
- **Delay input**: Compact inline: `[3] days after previous step`. First step always says "Immediately" if delay=0.
- **Skip if selector**: Simple dropdown with options mapped to the skip_if object values. "None" = `null`.
- **Action config sections**: Collapsible card within the step card, always expanded by default. Title shows the channel name.
- **Activate button**: `variant="default"` (blue), prominent. Only shown when campaign is DRAFTED and has steps + leads. Show validation message if missing.
- **Progress status badges**: pending=outline, executing=`bg-yellow-600/20 text-yellow-400`, executed=success, skipped=secondary, failed=destructive, completed=`bg-blue-600/20 text-blue-400`.
- **Read-only sequence view**: Cards with channel icon, step number, delay text, skip condition, and a summary of the action config (subject for email, message preview for LinkedIn, description for direct mail).

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Campaign list shows "Multi-Channel" badge for multi-channel campaigns
3. "Multi-Channel" filter option works in channel filter
4. Create Campaign dialog has Multi-Channel option that creates via new endpoint
5. Multi-channel campaign detail page shows Sequence, Leads, Progress, Overview tabs
6. Sequence editor allows adding steps with channel selection and config
7. Each channel shows appropriate action_config form fields
8. Delay days and skip-if conditions are configurable per step
9. Reorder (up/down) and remove steps work correctly
10. Save sequence calls PUT endpoint and updates read-only view
11. Edit only available when campaign is DRAFTED
12. Add leads form works with phone field for voicemail-capable campaigns
13. Activate button validates steps + leads exist, calls activate endpoint
14. Lead progress tab shows per-lead status with step info
15. Progress status filter works
16. All loading/empty/error states handled
17. No regressions to single-channel campaign flows

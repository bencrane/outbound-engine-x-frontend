# Directive #3: Campaigns List + Detail Pages

## Context

This is the core feature of the product. The foundation (Directive #1) and dashboard (Directive #2) are complete. We have:
- Typed API client (`src/lib/api-client.ts`) with generated types (`src/lib/api-types.ts`)
- TanStack Query wired up, with existing hooks in `src/features/campaigns/api.ts` (`useCampaigns`, `useRecentMessages`) and `src/features/analytics/api.ts`
- UI primitives: Button, Badge (with success/warning variants), Card, Skeleton
- RBAC: `<RouteGuard>`, `<Gate>`, `usePermission` — campaigns requires `campaigns.list` to view, `campaigns.manage` to mutate
- Formatting utils: `formatRelativeTime`, `formatNumber`, `formatPercent` in `src/lib/format.ts`
- The dashboard already links to `/campaigns/{campaign_id}` — those links need to work when this directive is done

Your job is to build:
1. A **campaign list page** at `/campaigns`
2. A **campaign detail page** at `/campaigns/[id]` with tabbed sub-views

---

## API Endpoints

### Already Hooked Up (in `src/features/campaigns/api.ts`)
- `useCampaigns(options?)` → `GET /api/campaigns/`
- `useRecentMessages(options?)` → `GET /api/campaigns/messages`

### New Hooks to Create (add to `src/features/campaigns/api.ts`)

| Hook | Method | Endpoint | Returns |
|------|--------|----------|---------|
| `useCampaign(campaignId)` | GET | `/api/campaigns/{campaign_id}` | `CampaignResponse` |
| `useCampaignAnalyticsSummary(campaignId)` | GET | `/api/campaigns/{campaign_id}/analytics/summary` | `CampaignAnalyticsSummaryResponse` |
| `useCampaignLeads(campaignId)` | GET | `/api/campaigns/{campaign_id}/leads` | `CampaignLeadResponse[]` |
| `useCampaignSequence(campaignId)` | GET | `/api/campaigns/{campaign_id}/sequence` | `CampaignSequenceResponse` |
| `useCampaignSchedule(campaignId)` | GET | `/api/campaigns/{campaign_id}/schedule` | `CampaignScheduleResponse` |
| `useCampaignReplies(campaignId)` | GET | `/api/campaigns/{campaign_id}/replies` | `CampaignMessageResponse[]` |
| `useSequenceStepPerformance(campaignId)` | GET | `/api/analytics/campaigns/{campaign_id}/sequence-steps` | `SequenceStepPerformanceItem[]` |

### Mutation Hooks to Create

| Hook | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| `useUpdateCampaignStatus()` | POST | `/api/campaigns/{campaign_id}/status` | Change campaign status (ACTIVE, PAUSED, STOPPED) |
| `usePauseCampaignLead()` | POST | `/api/campaigns/{campaign_id}/leads/{lead_id}/pause` | Pause a lead |
| `useResumeCampaignLead()` | POST | `/api/campaigns/{campaign_id}/leads/{lead_id}/resume` | Resume a lead |
| `useUnsubscribeCampaignLead()` | POST | `/api/campaigns/{campaign_id}/leads/{lead_id}/unsubscribe` | Unsubscribe a lead |

Mutation hooks should use `useMutation` from TanStack Query. On success, invalidate the relevant query keys so the UI refreshes. For example, after pausing a lead, invalidate `["campaigns", campaignId, "leads"]`.

### Key Schemas

**CampaignResponse:**
```
id, company_id, provider_id, external_campaign_id, name,
status: "DRAFTED" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED",
created_by_user_id, created_at, updated_at
```

**CampaignAnalyticsSummaryResponse:**
```
campaign_id, leads_total, leads_active, leads_paused, leads_unsubscribed,
replies_total, outbound_messages_total, reply_rate, campaign_status,
last_activity_at, updated_at
```

**CampaignLeadResponse:**
```
id, company_campaign_id, external_lead_id,
email, first_name, last_name, company_name, title,
status: "active" | "paused" | "unsubscribed" | "replied" | "bounced" | "pending" | "contacted" | "connected" | "not_interested" | "unknown",
category, updated_at
```

**CampaignSequenceResponse:**
```
campaign_id,
sequence: Array<Record<string, any>>,  // provider-specific, typically has: seq_number, subject, email_body, seq_delay_details
source: string,
version: number | null,
updated_at
```

**CampaignScheduleResponse:**
```
campaign_id,
schedule: Record<string, any>,  // typically has day booleans, start_time, end_time, timezone
source: string,
updated_at
```

**CampaignMessageResponse (used for replies):**
```
id, company_campaign_id, company_campaign_lead_id,
external_message_id, direction: "inbound" | "outbound" | "unknown",
sequence_step_number, subject, body, sent_at, updated_at
```

**SequenceStepPerformanceItem:**
```
campaign_id, sequence_step_number,
outbound_messages_total, replies_total, reply_rate,
last_activity_at, updated_at
```

---

## New UI Components Needed

Before building the pages, create these shadcn/ui-style components. Follow the same pattern as the existing Button/Badge/Card components (use `cn()`, dark-first zinc palette, `data-slot` attributes, `ComponentProps` typing).

### `src/components/ui/table.tsx`

A semantic HTML table component system:
- `Table` — `<table>` wrapper with `min-w-full text-sm` base styles
- `TableHeader` — `<thead>`
- `TableBody` — `<tbody>`
- `TableRow` — `<tr>` with `border-b border-zinc-800` hover state
- `TableHead` — `<th>` with `text-zinc-400 font-medium px-3 py-3`
- `TableCell` — `<td>` with `px-3 py-3 text-white`

### `src/components/ui/tabs.tsx`

A client-side tab component (no routing, just local state):
- `Tabs` — container that manages active tab state
- `TabsList` — horizontal tab button bar with `border-b border-zinc-800`
- `TabsTrigger` — individual tab button. Active: `text-white border-b-2 border-blue-500`. Inactive: `text-zinc-400 hover:text-white`
- `TabsContent` — content panel that shows when its tab is active

Implementation: Use React context internally. The `Tabs` component takes a `defaultValue` prop and manages the active tab. `TabsTrigger` has a `value` prop. `TabsContent` has a `value` prop and only renders when it matches the active tab.

### `src/components/ui/dropdown-menu.tsx`

A simple dropdown menu for lead actions (pause/resume/unsubscribe):
- `DropdownMenu` — wrapper, manages open/close state
- `DropdownMenuTrigger` — the element that opens the menu (usually a button)
- `DropdownMenuContent` — the floating menu panel. Position it absolute below the trigger. Dark background (`bg-zinc-800 border border-zinc-700 rounded-md shadow-lg`). Use a simple click-outside-to-close pattern.
- `DropdownMenuItem` — individual menu item with hover state

Keep it simple — no portals, no popper.js. Just CSS absolute positioning with a `relative` parent. This is sufficient for table row action menus.

### `src/components/ui/input.tsx`

Standard text input:
- Dark styled: `bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500`
- Focus: `focus:border-blue-500 focus:ring-1 focus:ring-blue-500`
- Extends `ComponentProps<"input">` with `cn()` for className merging

---

## Page 1: Campaign List (`/campaigns`)

Replace `src/app/(protected)/campaigns/page.tsx`.

### Layout

```
┌──────────────────────────────────────────────┐
│ Campaigns               [+ Create Campaign]  │
│ Manage your outreach campaigns               │
│                                              │
│ [Filter by status ▾] [Search campaigns...]   │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Name  │ Status │ Leads │ Sent │ Updated  │ │
│ │───────┼────────┼───────┼──────┼──────────│ │
│ │ ...   │ ...    │ ...   │ ...  │ ...      │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Features

1. **Campaign table** using the new `Table` components, populated from `useCampaigns()`.

   Columns:
   | Column | Field | Notes |
   |--------|-------|-------|
   | Name | `name` | Clickable link to `/campaigns/{id}` |
   | Status | `status` | `Badge` with status color mapping (same as dashboard) |
   | Created | `created_at` | Formatted date (e.g. "Jan 15, 2026") |
   | Updated | `updated_at` | Relative time |

2. **Status filter** — a row of filter buttons (All, Active, Paused, Drafted, Completed, Stopped). Clicking one filters the table client-side. "All" is selected by default. Use a simple button group, not a `<select>`.

3. **Search** — a text `Input` that filters campaigns by name (client-side, case-insensitive). Debounce is not needed since the list is in-memory.

4. **"Create Campaign" button** — gated behind `campaigns.create` permission using `<Gate>`. For now, just show a disabled button or a placeholder toast — campaign creation involves naming and company selection, which we'll implement later. The button should exist in the UI.

5. **Loading state** — show table skeleton (5 rows) while `useCampaigns` is loading.

6. **Empty state** — "No campaigns found" message if the list is empty after filtering.

7. **Error state** — inline error message if the API call fails.

### Add `formatDate` to `src/lib/format.ts`

```typescript
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
```

---

## Page 2: Campaign Detail (`/campaigns/[id]`)

Create `src/app/(protected)/campaigns/[id]/page.tsx`.

This is a tabbed detail view. The page fetches the campaign by ID and displays sub-views in tabs.

### Page Header

```
┌──────────────────────────────────────────────┐
│ ← Back to Campaigns                         │
│                                              │
│ Campaign Name Here               [ACTIVE ▾]  │
│ Created Jan 15, 2026                         │
└──────────────────────────────────────────────┘
```

- **Back link** — `← Back to Campaigns` links to `/campaigns`
- **Campaign name** — large title
- **Status badge** + **status action dropdown** — gated behind `campaigns.manage` permission. The dropdown lets org_admins change status (e.g. Pause, Stop, Resume). Uses the `useUpdateCampaignStatus` mutation. After mutation success, invalidate `["campaigns", campaignId]`.
- If the campaign fetch fails or returns 404, show an error state.

### Tabs

Use the new `Tabs` component with four tabs:

#### Tab 1: Overview (default)

Shows campaign analytics from `useCampaignAnalyticsSummary(campaignId)`:

**Stat cards** (same pattern as dashboard, 2x2 or 1x4 grid):
| Stat | Field |
|------|-------|
| Total Leads | `leads_total` |
| Active Leads | `leads_active` |
| Messages Sent | `outbound_messages_total` |
| Reply Rate | `reply_rate` (formatted as %) |

**Additional detail cards:**
- Leads breakdown: active / paused / unsubscribed (small bar or just numbers)
- Replies total with count

**Sequence Step Performance** — from `useSequenceStepPerformance(campaignId)`:
A small table showing each sequence step's performance:
| Step | Sent | Replies | Reply Rate |
|------|------|---------|------------|
| Step 1 | 450 | 23 | 5.1% |
| Step 2 | 380 | 15 | 3.9% |

Show skeleton while loading. Show "No sequence data" if empty.

#### Tab 2: Leads

Shows all leads from `useCampaignLeads(campaignId)` in a table:

| Column | Field | Notes |
|--------|-------|-------|
| Name | `first_name` + `last_name` | Combined, fallback to email if both null |
| Email | `email` | Muted text |
| Company | `company_name` | — |
| Title | `title` | — |
| Status | `status` | Badge with appropriate color |
| Actions | — | DropdownMenu with Pause/Resume/Unsubscribe (gated by `campaigns.manage`) |

**Lead status badge colors:**
| Status | Variant |
|--------|---------|
| active | success |
| replied | default (blue) |
| contacted, connected | secondary |
| paused | warning |
| bounced, unsubscribed, not_interested | destructive |
| pending, unknown | outline |

**Lead actions dropdown** — only shown for users with `campaigns.manage` permission:
- If lead is `active` or `contacted` or `connected` or `replied`: show "Pause" and "Unsubscribe"
- If lead is `paused`: show "Resume" and "Unsubscribe"
- If lead is `unsubscribed` or `bounced`: show nothing (or greyed out)

Each action calls the corresponding mutation hook. Show some visual feedback on success (invalidate queries so the table refreshes — the status badge will update).

**Client-side search** — filter leads by name or email.

**Loading/empty/error states** as with all other tables.

#### Tab 3: Sequence

Shows the campaign's email sequence from `useCampaignSequence(campaignId)`.

The `sequence` field is an array of provider-specific objects. Based on the EmailBison/SmartLead format, each step typically has:
```json
{
  "seq_number": 1,
  "subject": "Quick question",
  "email_body": "Hi {{first_name}}, ...",
  "seq_delay_details": { "delay_in_days": 0 }
}
```

Display each step as a card:
```
┌────────────────────────────────────────┐
│ Step 1 · Sent immediately              │
│                                        │
│ Subject: Quick question                │
│                                        │
│ Hi {{first_name}}, ...                 │
│ (rendered as read-only formatted text) │
└────────────────────────────────────────┘
```

- Step number from `seq_number`
- Delay: "Sent immediately" if delay is 0, otherwise "Sent after N days"
- Subject line
- Body text (render as-is, preserve whitespace, show template variables like `{{first_name}}` as highlighted spans)

This is **read-only** for now. No editing.

Show "No sequence configured" if the array is empty.

Also show the **schedule** from `useCampaignSchedule(campaignId)` below the sequence steps:
```
Schedule: Mon-Fri, 9:00 AM - 5:00 PM (America/New_York)
```
Parse the schedule object's day booleans, start_time, end_time, and timezone. Display as a simple text summary. Show "No schedule configured" if empty.

#### Tab 4: Replies

Shows all replies from `useCampaignReplies(campaignId)`.

Render as a list of reply cards (similar to the dashboard activity feed but with more detail):

```
┌────────────────────────────────────────┐
│ ← Inbound · Jan 15, 2026 at 2:30 PM   │
│                                        │
│ Subject: Re: Quick question            │
│                                        │
│ Hi, thanks for reaching out. We'd be   │
│ interested in learning more...         │
└────────────────────────────────────────┘
```

- Direction indicator (inbound = green, outbound = blue)
- Timestamp (full date + time for replies, not relative)
- Subject
- Full body text (not truncated like on dashboard)

Sort by `sent_at` descending (newest first).

Show "No replies yet" if empty.

---

## Feature Components

Place campaign-specific components in `src/features/campaigns/components/`:

| Component | File | Purpose |
|-----------|------|---------|
| `CampaignStatusBadge` | `campaign-status-badge.tsx` | Reusable badge that maps campaign status → variant. Extract the `statusToBadgeVariant` function from the dashboard and reuse it here. |
| `LeadStatusBadge` | `lead-status-badge.tsx` | Maps lead status → badge variant |
| `CampaignOverviewTab` | `campaign-overview-tab.tsx` | Overview tab content |
| `CampaignLeadsTab` | `campaign-leads-tab.tsx` | Leads tab content |
| `CampaignSequenceTab` | `campaign-sequence-tab.tsx` | Sequence tab content |
| `CampaignRepliesTab` | `campaign-replies-tab.tsx` | Replies tab content |

The `CampaignStatusBadge` should also be imported into the dashboard to replace its inline `statusToBadgeVariant` function — DRY up that code.

---

## Design Specifications

- **Same dark zinc aesthetic** as the rest of the app. No new colors.
- **Page padding**: `p-8` as with dashboard.
- **Back link**: `text-zinc-400 hover:text-white` with a `ChevronLeft` icon from lucide-react.
- **Tab bar**: Bottom-bordered, not pill-style. Active tab has `border-b-2 border-blue-500 text-white`. Inactive: `text-zinc-400`.
- **Tables**: Use the new `Table` component system. Consistent with the dashboard campaign table style.
- **Template variables** in sequence body: Highlight `{{variable_name}}` with a `bg-blue-500/10 text-blue-400 px-1 rounded` inline style.
- **Loading states**: Skeleton everywhere. No spinners.
- **Responsive**: Tables should be horizontally scrollable on small screens (`overflow-x-auto`).

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/table.tsx` | Table component system |
| `src/components/ui/tabs.tsx` | Tabs component |
| `src/components/ui/dropdown-menu.tsx` | Dropdown menu |
| `src/components/ui/input.tsx` | Text input |
| `src/app/(protected)/campaigns/[id]/page.tsx` | Campaign detail page |
| `src/features/campaigns/components/campaign-status-badge.tsx` | Reusable status badge |
| `src/features/campaigns/components/lead-status-badge.tsx` | Lead status badge |
| `src/features/campaigns/components/campaign-overview-tab.tsx` | Overview tab |
| `src/features/campaigns/components/campaign-leads-tab.tsx` | Leads tab |
| `src/features/campaigns/components/campaign-sequence-tab.tsx` | Sequence tab |
| `src/features/campaigns/components/campaign-replies-tab.tsx` | Replies tab |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/campaigns/api.ts` | Add all new query + mutation hooks |
| `src/app/(protected)/campaigns/page.tsx` | Complete rewrite — real campaign list |
| `src/lib/format.ts` | Add `formatDate` and `formatDateTime` utilities |
| `src/app/(protected)/dashboard/page.tsx` | Import `CampaignStatusBadge` instead of inline function |

## Files NOT to Modify

Do not touch:
- `src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/api.ts`
- `src/lib/permissions.ts`, `src/lib/auth-context.tsx`
- `src/components/providers.tsx`, `src/components/sidebar.tsx`
- `src/components/gate.tsx`, `src/components/route-guard.tsx`
- `src/app/layout.tsx`, `src/app/(protected)/layout.tsx`
- `src/features/analytics/api.ts`
- Inbox, leads, or settings pages

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. `/campaigns` shows a filterable, searchable table of all campaigns
3. Clicking a campaign name navigates to `/campaigns/{id}`
4. `/campaigns/{id}` shows campaign header with name, status badge, and back link
5. Overview tab displays analytics summary + sequence step performance
6. Leads tab displays all leads with status badges and action dropdowns
7. Lead actions (pause/resume/unsubscribe) call the API and refresh the table
8. Sequence tab renders each email step as a readable card with template variable highlighting
9. Schedule summary is displayed below the sequence
10. Replies tab shows all replies with direction, timestamp, subject, body
11. All tabs have proper loading, empty, and error states
12. Status dropdown (campaigns.manage gated) allows changing campaign status
13. Dashboard is updated to use the shared `CampaignStatusBadge` component
14. `RouteGuard` with `campaigns.list` permission is on the list page
15. Campaign detail page gracefully handles invalid/missing campaign IDs
16. All four new UI components (Table, Tabs, DropdownMenu, Input) follow shadcn/ui patterns

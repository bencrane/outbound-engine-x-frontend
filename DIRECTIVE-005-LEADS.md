# Directive #5: Leads Page

## Context

Dashboard, Campaigns, and Inbox are complete. The Leads page provides a **cross-campaign view of all leads** — the key differentiator from the per-campaign Leads tab already built in Directive #3.

### API Constraint

There is **no standalone `/api/leads/` endpoint**. Leads are always scoped to a campaign:
- Email: `GET /api/campaigns/{campaign_id}/leads` → `CampaignLeadResponse[]`
- LinkedIn: `GET /api/linkedin/campaigns/{campaign_id}/leads` → `LinkedinCampaignLeadResponse[]`

Both schemas have identical shapes: `id, company_campaign_id, external_lead_id, email, first_name, last_name, company_name, title, status, category, updated_at`.

The Leads page must aggregate across campaigns by:
1. Fetching all campaigns (email + LinkedIn)
2. Fetching leads from each campaign in parallel
3. Merging into a unified list

### Existing Code to Reuse

- `useCampaigns()` in `src/features/campaigns/api.ts` — fetches email campaigns
- `useCampaignLeads(campaignId)` in `src/features/campaigns/api.ts` — fetches leads for one email campaign
- `LeadStatusBadge` in `src/features/campaigns/components/lead-status-badge.tsx` — status badge mapping
- `useLeadThread(campaignId, leadId)` in `src/features/inbox/api.ts` — fetches message history for a lead
- `InboxThreadMessage` in `src/features/inbox/components/inbox-thread-message.tsx` — renders a message card
- Table, Input, DropdownMenu, Button, Badge, Select, Skeleton, Card — all UI components available

---

## API Endpoints

### Existing Hooks (already built)
| Hook | Source File | Endpoint |
|------|------------|----------|
| `useCampaigns()` | `src/features/campaigns/api.ts` | `GET /api/campaigns/` |
| `useCampaignLeads(campaignId)` | `src/features/campaigns/api.ts` | `GET /api/campaigns/{campaign_id}/leads` |
| `useLeadThread(campaignId, leadId)` | `src/features/inbox/api.ts` | `GET /api/campaigns/{campaign_id}/leads/{lead_id}/messages` |

### New Hooks to Create

Add to `src/features/leads/api.ts`:

#### `useLinkedinCampaigns()`

Wraps `GET /api/linkedin/campaigns/`. Returns `LinkedinCampaignResponse[]`.

Query key: `["linkedin", "campaigns"]`

#### `useLinkedinCampaignLeads(campaignId)`

Wraps `GET /api/linkedin/campaigns/{campaign_id}/leads`. Returns `LinkedinCampaignLeadResponse[]`.

Query key: `["linkedin", campaignId, "leads"]`

Only enabled when `campaignId` is truthy.

#### `useAllLeads(emailCampaigns, linkedinCampaigns)`

This is NOT a single API call — it's a **composed hook** that uses `useQueries` from TanStack Query to fetch leads from ALL campaigns in parallel.

```typescript
function useAllLeads(
  emailCampaignIds: string[],
  linkedinCampaignIds: string[]
): {
  leads: NormalizedLead[];
  isLoading: boolean;
  error: Error | null;
}
```

It should:
1. Create one `useQueries` call that generates a query for each campaign (both email and LinkedIn)
2. Each individual query calls the appropriate endpoint (`/api/campaigns/{id}/leads` for email, `/api/linkedin/campaigns/{id}/leads` for LinkedIn)
3. Normalize results into a `NormalizedLead` type that includes the campaign context:

```typescript
interface NormalizedLead {
  id: string;
  campaign_id: string;
  campaign_name: string;
  channel: "email" | "linkedin";
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  title: string | null;
  status: string;
  category: string | null;
  updated_at: string;
}
```

4. Merge all results into a flat array
5. Report `isLoading: true` while any individual query is still loading
6. Report the first error encountered (if any)

---

## What to Build

### Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Leads                                                            │
│ View leads across all campaigns                                  │
│                                                                  │
│ [Search by name or email...]                                     │
│ [Campaign ▾] [Channel ▾] [Status ▾]                             │
│                                                                  │
│ Showing 1,234 leads                                              │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Name  │ Email │ Company │ Campaign │ Channel │ Status │ ··· │ │
│ │───────┼───────┼─────────┼──────────┼─────────┼────────┼─────│ │
│ │ ...   │ ...   │ ...     │ ...      │ ...     │ ...    │ ··· │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [Lead detail slide-out / expanded row when clicked]              │
└──────────────────────────────────────────────────────────────────┘
```

### Filters (all client-side, since data is already in memory)

1. **Search** — text input that filters by `first_name`, `last_name`, `email`, or `company_name` (case-insensitive)

2. **Campaign filter** — `<Select>` dropdown with "All Campaigns" default, populated from both email and LinkedIn campaigns. Group options by channel:
   ```
   All Campaigns
   ── Email ──
   Q2 Outbound - Agencies
   Cold Outreach #3
   ── LinkedIn ──
   LinkedIn - Decision Makers
   ```

3. **Channel filter** — Button group: "All", "Email", "LinkedIn"

4. **Status filter** — `<Select>` dropdown: "All Statuses", then each unique status from the data (active, paused, replied, bounced, etc.)

5. **Lead count** — Show "Showing X leads" (after filters applied) below the filters.

### Lead Table

Use the `Table` component. Columns:

| Column | Field | Notes |
|--------|-------|-------|
| Name | `first_name` + `last_name` | Combined, fallback to email if both null. Clickable to expand detail. |
| Email | `email` | Muted text (`text-zinc-400`) |
| Company | `company_name` | — |
| Campaign | `campaign_name` | With a small channel indicator |
| Channel | `channel` | Badge: "Email" (blue) or "LinkedIn" (secondary) |
| Status | `status` | `LeadStatusBadge` (already built) |
| Updated | `updated_at` | Relative time |

**Sorting**: Default sort by `updated_at` descending. Allow clicking column headers to toggle sort (Name, Campaign, Status, Updated). Implement client-side sorting with a `sortField` + `sortDirection` state.

### Lead Detail Panel

When a lead row is clicked, show a **detail panel below the row** (expandable row pattern — NOT a separate page or modal). The panel shows:

1. **Lead info header**: Full name, email, company, title, status badge
2. **Message history**: Fetch via `useLeadThread(campaign_id, lead_id)` and render using the `InboxThreadMessage` component (reuse from inbox feature). Show messages in chronological order.
3. **Loading state**: Skeleton while thread loads
4. **Empty state**: "No message history" if no messages
5. **Close button**: Clicking the row again or an X button collapses the panel

Only one lead detail panel can be open at a time.

---

## Feature Components

Place in `src/features/leads/components/`:

| Component | File | Purpose |
|-----------|------|---------|
| `LeadsTable` | `leads-table.tsx` | The main leads table with sorting |
| `LeadsFilters` | `leads-filters.tsx` | Search + filter controls |
| `LeadDetailPanel` | `lead-detail-panel.tsx` | Expandable row detail with message history |

---

## Design Specifications

- **Page padding**: `p-8` like other pages.
- **Table**: Use `Table` components. Same dark style as campaigns table.
- **Channel badge**: Email = `variant="default"` (blue). LinkedIn = `variant="secondary"` (zinc).
- **Sortable column headers**: Show a small `ChevronUp`/`ChevronDown` icon from lucide-react next to the active sort column. Clickable headers have `cursor-pointer hover:text-white` styling.
- **Expanded detail panel**: Render as a full-width `<TableRow>` with `colSpan` covering all columns. Content: a `Card` inside the cell with the lead info and message thread. Background: `bg-zinc-900/50` to visually differentiate.
- **Loading**: Show a full-table skeleton (8 rows) while all campaigns' leads are loading. Show a count of how many campaigns have loaded out of total (e.g., "Loading leads from 5/12 campaigns...") during the parallel fetch.
- **Empty state**: "No leads found" when filters produce no results. "No leads in any campaign" when there truly are no leads.

---

## Role Behavior

- **`org_admin`**: Sees all leads across all companies. Pass `mine_only: false, all_companies: true` when fetching campaigns.
- **`company_admin`**: Sees their company's leads. API scopes automatically via JWT.
- **`company_member`**: Does NOT have `leads.list` permission. `RouteGuard` redirects them. No special handling needed.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/leads/components/leads-table.tsx` | Main leads table with sorting |
| `src/features/leads/components/leads-filters.tsx` | Filter controls |
| `src/features/leads/components/lead-detail-panel.tsx` | Expandable row detail |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/leads/api.ts` | Replace placeholder with hooks: `useLinkedinCampaigns`, `useLinkedinCampaignLeads`, `useAllLeads` |
| `src/app/(protected)/leads/page.tsx` | Complete rewrite — real leads page |

## Files NOT to Modify

Do not touch:
- Any file in `src/lib/`
- Any file in `src/components/` (including `ui/`)
- Any file in `src/features/campaigns/` or `src/features/inbox/` or `src/features/analytics/` or `src/features/settings/`
- Dashboard, campaigns, inbox, or settings pages
- `src/app/layout.tsx`, `src/app/(protected)/layout.tsx`

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. `/leads` shows a unified table of leads from all email AND LinkedIn campaigns
3. Leads are fetched in parallel across all campaigns using `useQueries`
4. Search filters by name, email, or company (client-side, instant)
5. Campaign dropdown filters to a specific campaign
6. Channel filter (All/Email/LinkedIn) works
7. Status filter works
8. Column header sorting works (at least Name, Status, Updated)
9. Lead count updates correctly as filters are applied
10. Clicking a lead row expands a detail panel with lead info + message history
11. Message history reuses `InboxThreadMessage` component from inbox feature
12. Only one detail panel open at a time
13. Loading state shows progress ("Loading leads from X/Y campaigns...")
14. Empty/error states handled gracefully
15. `RouteGuard` with `leads.list` preserved
16. `org_admin` sees all companies' leads, `company_admin` sees their company only

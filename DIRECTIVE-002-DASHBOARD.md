# Directive #2: Dashboard Page

## Context

The foundation infrastructure is complete (Directive #1). We have:
- Generated TypeScript types from `openapi.json` at `src/lib/api-types.ts`
- Typed API client at `src/lib/api-client.ts` (openapi-fetch with auth middleware)
- TanStack Query wired up via `src/components/providers.tsx`
- RBAC system at `src/lib/permissions.ts` (roles: `org_admin`, `company_admin`, `company_member`)
- `<RouteGuard>` and `<Gate>` components for permission checks
- UI primitives: Button, Badge, Card, Skeleton (shadcn/ui pattern, dark zinc theme)
- Feature folder structure at `src/features/`
- `cn()` utility at `src/lib/utils.ts`

Your job is to build a **real, data-driven Dashboard page** that replaces the current placeholder. This is the first page users see after login — it should feel polished and immediately useful.

---

## API Endpoints to Use

### 1. `GET /api/analytics/campaigns`

Returns an array of `CampaignAnalyticsDashboardItem`:
```typescript
{
  campaign_id: string
  company_id: string
  campaign_name: string
  campaign_status: "DRAFTED" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED"
  leads_total: number
  replies_total: number
  outbound_messages_total: number
  reply_rate: number            // decimal, e.g. 0.045 = 4.5%
  last_activity_at: string | null  // ISO datetime
  updated_at: string               // ISO datetime
}
```
Query params (all optional): `company_id`, `from_ts`, `to_ts`, `mine_only`

### 2. `GET /api/analytics/clients`

Returns an array of `ClientAnalyticsRollupItem`:
```typescript
{
  company_id: string
  campaigns_total: number
  leads_total: number
  outbound_messages_total: number
  replies_total: number
  reply_rate: number
  last_activity_at: string | null
  updated_at: string
}
```
Query params (all optional): `company_id`, `from_ts`, `to_ts`, `mine_only`

### 3. `GET /api/campaigns/`

Returns an array of `CampaignResponse`:
```typescript
{
  id: string
  company_id: string
  provider_id: string
  external_campaign_id: string
  name: string
  status: "DRAFTED" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED"
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}
```
Query params: `company_id`, `all_companies` (boolean), `mine_only` (boolean)

### 4. `GET /api/campaigns/messages`

Returns an array of `OrgCampaignMessageResponse`:
```typescript
{
  id: string
  company_id: string
  company_campaign_id: string
  company_campaign_lead_id: string | null
  external_message_id: string
  direction: "inbound" | "outbound" | "unknown"
  sequence_step_number: number | null
  subject: string | null
  body: string | null
  sent_at: string | null
  updated_at: string
}
```
Query params: `company_id`, `all_companies`, `campaign_id`, `direction`, `mine_only`, `limit` (max 500), `offset`

---

## How to Use the Typed API Client

The API client is at `src/lib/api-client.ts`. It's an `openapi-fetch` client typed against the generated `paths` interface. Use it like this:

```typescript
import { apiClient } from "@/lib/api-client";

// GET request
const { data, error } = await apiClient.GET("/api/analytics/campaigns", {
  params: { query: { mine_only: false } },
});
// data is typed as CampaignAnalyticsDashboardItem[]

// POST request (example)
const { data, error } = await apiClient.POST("/api/some-path", {
  body: { key: "value" },
});
```

Wrap these calls in TanStack Query hooks. Place these hooks in the appropriate `src/features/*/api.ts` files.

---

## What to Build

### Feature API Hooks

**`src/features/analytics/api.ts`** — Replace the placeholder with real TanStack Query hooks:

- `useCampaignAnalytics(options?)` — calls `GET /api/analytics/campaigns`
- `useClientAnalytics(options?)` — calls `GET /api/analytics/clients`

Each hook should:
- Use `useQuery` from `@tanstack/react-query`
- Use `apiClient.GET(...)` for the fetch function
- Have a descriptive query key like `["analytics", "campaigns", filters]`
- Accept optional filter params (company_id, from_ts, to_ts, mine_only)
- Return the standard useQuery result (data, isLoading, error, etc.)

**`src/features/campaigns/api.ts`** — Replace the placeholder:

- `useCampaigns(options?)` — calls `GET /api/campaigns/`
- `useRecentMessages(options?)` — calls `GET /api/campaigns/messages` with `limit: 20`

### Dashboard Page

Replace `src/app/(protected)/dashboard/page.tsx` entirely. The page should have these sections:

#### Section 1: Summary Stats (top row)

Four `Card` components in a responsive grid showing aggregate numbers derived from the campaign analytics data:

| Stat | Source | Format |
|------|--------|--------|
| Total Campaigns | count of campaigns from analytics | number |
| Active Leads | sum of `leads_total` across all campaigns | number with comma formatting |
| Messages Sent | sum of `outbound_messages_total` | number with comma formatting |
| Avg Reply Rate | average of `reply_rate` across campaigns | percentage with 1 decimal, e.g. "4.5%" |

Each card should show:
- An icon (use lucide-react: `Megaphone`, `Users`, `Send`, `Reply`)
- The stat label
- The stat value (large text)
- A `Skeleton` placeholder while loading

#### Section 2: Campaign Performance Table

A table showing all campaigns from the campaign analytics endpoint, sorted by `last_activity_at` descending (most recent first). Columns:

| Column | Field | Notes |
|--------|-------|-------|
| Campaign | `campaign_name` | Text, left-aligned |
| Status | `campaign_status` | Use a `Badge` with color variants: ACTIVE=green, PAUSED=yellow, DRAFTED=zinc, STOPPED=red, COMPLETED=blue |
| Leads | `leads_total` | Right-aligned number |
| Sent | `outbound_messages_total` | Right-aligned number |
| Replies | `replies_total` | Right-aligned number |
| Reply Rate | `reply_rate` | Right-aligned percentage |
| Last Activity | `last_activity_at` | Relative time (e.g. "2h ago", "3d ago") — write a small utility for this |

The table should:
- Use a clean, minimal dark style consistent with the app
- Show a skeleton loading state (5 rows of skeleton blocks)
- Show an empty state if no campaigns exist ("No campaigns yet")
- Eventually link campaign names to `/campaigns/{campaign_id}` (just make them `<Link>` elements now, the detail page doesn't exist yet)

#### Section 3: Recent Activity Feed

A feed of the 20 most recent messages from the messages endpoint. Each item shows:
- Direction indicator: inbound (green left arrow icon) or outbound (blue right arrow icon)
- Subject line (or "No subject" in muted text)
- Truncated body preview (first ~100 chars)
- Timestamp (relative time)

Show a skeleton loading state while fetching. Show "No recent activity" if empty.

### Badge Variants for Campaign Status

The existing `Badge` component only has `default`, `secondary`, `destructive`, `outline` variants. **Add these status-specific variants** to `src/components/ui/badge.tsx`:

| Variant | Colors | Used For |
|---------|--------|----------|
| `success` | `bg-emerald-600/20 text-emerald-400 border-emerald-500/30` | ACTIVE status |
| `warning` | `bg-yellow-600/20 text-yellow-400 border-yellow-500/30` | PAUSED status |

These are transparent background badges that look good on dark backgrounds.

### Relative Time Utility

Create `src/lib/format.ts` with:

- `formatRelativeTime(dateString: string): string` — converts ISO datetime to relative time (e.g. "just now", "5m ago", "2h ago", "3d ago", "Jan 15"). No external library — this is simple enough to do with `Date` math.
- `formatNumber(n: number): string` — comma-formatted number (e.g. 1234 → "1,234")
- `formatPercent(rate: number): string` — e.g. 0.045 → "4.5%"

---

## Design Specifications

- **Layout**: Full width within the main content area. Use `p-8` for page padding (matching existing pages).
- **Page header**: "Dashboard" title with "Overview of your outreach performance" subtitle.
- **Grid**: Stats row uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` responsive grid.
- **Table**: Use semantic `<table>` with `<thead>` and `<tbody>`. Dark style: `bg-zinc-900` table, `border-zinc-800` borders, `text-zinc-400` headers, `text-white` data cells.
- **Card components**: Use the `Card` components from `src/components/ui/card.tsx` for the stat cards.
- **Colors**: Stay within the zinc palette for backgrounds/borders. Blue-600 for primary accents. Status badges use semantic colors (green, yellow, red).
- **Typography**: Page title is `text-2xl font-semibold text-white`. Subtitles are `text-zinc-400`. Stat values are `text-3xl font-semibold text-white`.
- **Loading states**: Every section shows `Skeleton` components while data is loading. No spinners.
- **Error states**: If an API call fails, show a subtle error message within the affected section (not a full-page error). Use `text-red-400` for error text.

---

## Role Behavior

- **`org_admin`**: Sees everything. Stats aggregate across all companies. The `mine_only` param should be `false` so they see all data.
- **`company_admin`**: Sees their company's data only. The API automatically scopes by JWT, so no special filtering needed.
- **`company_member`**: Does NOT have `dashboard.view` permission. The `RouteGuard` already redirects them to `/inbox`. No special handling needed in the dashboard component itself.

The `RouteGuard` wrapper must remain on the page.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/format.ts` | Relative time, number formatting, percent formatting utilities |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/analytics/api.ts` | Real TanStack Query hooks for analytics endpoints |
| `src/features/campaigns/api.ts` | Real TanStack Query hooks for campaigns + messages feed |
| `src/components/ui/badge.tsx` | Add `success` and `warning` variants |
| `src/app/(protected)/dashboard/page.tsx` | Complete rewrite — real dashboard with stats, table, activity feed |

## Files NOT to Modify

Do not touch any of the following:
- `src/lib/api-client.ts`
- `src/lib/api-types.ts`
- `src/lib/permissions.ts`
- `src/lib/auth-context.tsx`
- `src/lib/api.ts`
- `src/components/providers.tsx`
- `src/components/sidebar.tsx`
- `src/components/gate.tsx`
- `src/components/route-guard.tsx`
- `src/app/layout.tsx`
- `src/app/(protected)/layout.tsx`
- Any other page files (campaigns, inbox, leads, settings)

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Dashboard loads and displays real data from the API (or graceful loading/empty states)
3. Summary stats compute correct aggregates from campaign analytics
4. Campaign table sorts by last activity, shows all columns, uses correct badge colors
5. Activity feed shows recent messages with direction indicators
6. All three sections show proper skeleton loading states
7. Error states are handled gracefully (inline error messages, not crashes)
8. `RouteGuard` permission check is preserved
9. No regressions to login flow or other pages
10. `formatRelativeTime`, `formatNumber`, `formatPercent` utilities work correctly
11. TanStack Query hooks follow the pattern: query key + apiClient.GET + typed return

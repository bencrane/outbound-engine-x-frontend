# Directive #14: Direct Mail Analytics

## Context

Directive #13 built the direct mail feature module with piece management and address verification. This directive adds the analytics layer — the `GET /api/analytics/direct-mail` endpoint returns a rich dataset that needs proper visualization.

### Existing Code

- Direct mail feature module at `src/features/direct-mail/`
- Direct mail page at `/direct-mail` with tabs for piece types + verification
- Date range filter component at `src/features/analytics/components/date-range-filter.tsx` (built in D7)
- Dashboard already has analytics sections with date filtering
- `PieceStatusBadge` for status coloring

---

## API Endpoint

### `GET /api/analytics/direct-mail`

Query params:
- `company_id` (optional)
- `all_companies` (boolean, optional)
- `from_ts` (ISO datetime, optional)
- `to_ts` (ISO datetime, optional)

Returns `DirectMailAnalyticsResponse`:
```typescript
{
  org_id: string
  company_id: string | null
  all_companies: boolean
  from_ts: string       // ISO datetime
  to_ts: string         // ISO datetime

  total_pieces: number

  volume_by_type_status: Array<{
    piece_type: string    // "postcard" | "letter" | "self_mailer" | "check"
    status: string        // "queued" | "processing" | "in_transit" | "delivered" | etc.
    count: number
  }>

  delivery_funnel: Array<{
    stage: string         // e.g. "created" | "processing" | "in_transit" | "delivered"
    count: number
  }>

  failure_reason_breakdown: Array<{
    reason: string
    count: number
  }>

  daily_trends: Array<{
    day: string           // date string, e.g. "2026-01-15"
    created: number
    processed: number
    in_transit: number
    delivered: number
    returned: number
    failed: number
  }>

  updated_at: string
}
```

---

## New Hook

Add to `src/features/direct-mail/api.ts`:

#### `useDirectMailAnalytics(filters?)`

```typescript
interface DirectMailAnalyticsFilters {
  company_id?: string;
  all_companies?: boolean;
  from_ts?: string;
  to_ts?: string;
}
```

Query key: `["direct-mail", "analytics", filters]`

Calls `GET /api/analytics/direct-mail` with query params.

---

## What to Build

### Add Analytics Tab to Direct Mail Page

Add a 6th tab to the `/direct-mail` page: **"Analytics"**. This is the first tab (default) since it provides the overview.

New tab order: **Analytics** | Postcards | Letters | Self-Mailers | Checks | Verify Address

### Analytics Tab Layout

```
┌──────────────────────────────────────────────────────────┐
│ [Last 7 days] [Last 30 days] [Last 90 days] [All time]  │
│ From: [________]  To: [________]                         │
│                                                          │
│ ┌─── Summary ──────────────────────────────────────────┐ │
│ │  Total Pieces: 1,234                                 │ │
│ │  [Postcards: 650] [Letters: 300] [Self-Mailers: 200] │ │
│ │  [Checks: 84]                                        │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Volume by Type & Status ──────────────────────────┐ │
│ │ Type        │ Queued │ Processing │ In Transit │ ... │ │
│ │─────────────┼────────┼────────────┼────────────┼─────│ │
│ │ Postcard    │ 12     │ 45         │ 230        │ ... │ │
│ │ Letter      │ 5      │ 20         │ 150        │ ... │ │
│ │ ...         │        │            │            │     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─── Delivery Funnel ─────┐ ┌─── Failure Reasons ─────┐ │
│ │ Created      → 1,234    │ │ Address Not Found  → 23  │ │
│ │ Processing   → 1,100    │ │ Insufficient Funds → 5   │ │
│ │ In Transit   → 950      │ │ Template Error     → 3   │ │
│ │ Delivered    → 890      │ │ ...                      │ │
│ └─────────────────────────┘ └──────────────────────────┘ │
│                                                          │
│ ┌─── Daily Trends ────────────────────────────────────┐  │
│ │ Date       │ Created │ Processed │ In Transit │ ... │  │
│ │────────────┼─────────┼───────────┼────────────┼─────│  │
│ │ 2026-01-15 │ 45      │ 42        │ 38         │ ... │  │
│ │ 2026-01-16 │ 52      │ 48        │ 41         │ ... │  │
│ │ ...        │         │           │            │     │  │
│ └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Section 1: Date Range Filter

Reuse the `DateRangeFilter` component from `src/features/analytics/components/date-range-filter.tsx`. Pass `from_ts` and `to_ts` to the analytics hook.

### Section 2: Summary Cards

Top row of stat cards:
- **Total Pieces** — `total_pieces` (large number)
- **Per-type counts** — aggregate from `volume_by_type_status` by `piece_type`. Show 4 smaller cards: Postcards, Letters, Self-Mailers, Checks.

Use the `Card` component with the same pattern as dashboard stat cards.

### Section 3: Volume by Type & Status (Pivot Table)

A table with piece types as rows and statuses as columns. Cell values are counts.

| Type | Queued | Processing | Ready | In Transit | Delivered | Returned | Canceled | Failed |
|------|--------|-----------|-------|------------|-----------|----------|----------|--------|
| Postcard | 12 | 45 | 8 | 230 | 320 | 15 | 5 | 3 |
| Letter | 5 | 20 | 3 | 150 | 100 | 10 | 2 | 1 |
| ... | | | | | | | | |

Build this by pivoting the `volume_by_type_status` flat array into a 2D structure. Zero-fill missing combinations.

Status column headers should use the same colors as `PieceStatusBadge` for visual consistency.

### Section 4: Delivery Funnel

A vertical funnel display showing how pieces progress through stages.

Each stage is a row:
```
┌────────────────────────────────────────────┐
│ Created        ████████████████████  1,234 │
│ Processing     ███████████████████   1,100 │
│ In Transit     ████████████████      950   │
│ Delivered      ██████████████        890   │
└────────────────────────────────────────────┘
```

Implement as horizontal bars using simple `div` elements with percentage-based widths. The widest bar (first stage) = 100%, others scaled proportionally.

Stage name on the left, count on the right, colored bar in between.

### Section 5: Failure Reason Breakdown

A simple table or list:

| Reason | Count |
|--------|-------|
| Address Not Found | 23 |
| Insufficient Funds | 5 |

Sort by count descending. If empty, show "No failures in this period".

### Section 6: Daily Trends Table

A table with columns for each metric:

| Date | Created | Processed | In Transit | Delivered | Returned | Failed |
|------|---------|-----------|------------|-----------|----------|--------|

Sort by date descending (most recent first). Format dates as "Jan 15" or "Jan 15, 2026".

Show the last 30 rows by default with a "Show all" toggle if there are more.

---

## Dashboard Integration

Add a **Direct Mail summary** to the main dashboard for `org_admin` users who have `direct-mail.view` permission.

Add a new section to `src/app/(protected)/dashboard/page.tsx` (below the existing analytics sections, gated by `<Gate permission="direct-mail.view">`):

**Title**: "Direct Mail"

Show 4 stat cards in a row:
- Total Pieces (from `total_pieces`)
- Delivered (count where status = delivered, from `volume_by_type_status`)
- In Transit (count where status = in_transit)
- Failed/Returned (sum of failed + returned)

Link: "View Direct Mail →" links to `/direct-mail`.

Use the same date range filter as the rest of the dashboard (pass the dashboard's `from_ts`/`to_ts` to the direct mail analytics hook).

---

## Feature Components

| Component | File | Purpose |
|-----------|------|---------|
| `DirectMailAnalyticsTab` | `src/features/direct-mail/components/analytics-tab.tsx` | Full analytics tab content |
| `VolumePivotTable` | `src/features/direct-mail/components/volume-pivot-table.tsx` | Type × Status pivot table |
| `DeliveryFunnel` | `src/features/direct-mail/components/delivery-funnel.tsx` | Horizontal bar funnel |
| `DailyTrendsTable` | `src/features/direct-mail/components/daily-trends-table.tsx` | Daily metrics table |
| `DirectMailDashboardSection` | `src/features/direct-mail/components/dashboard-section.tsx` | Summary for main dashboard |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/direct-mail/components/analytics-tab.tsx` | Analytics tab |
| `src/features/direct-mail/components/volume-pivot-table.tsx` | Pivot table |
| `src/features/direct-mail/components/delivery-funnel.tsx` | Funnel visualization |
| `src/features/direct-mail/components/daily-trends-table.tsx` | Trends table |
| `src/features/direct-mail/components/dashboard-section.tsx` | Dashboard summary |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/direct-mail/api.ts` | Add `useDirectMailAnalytics` hook |
| `src/app/(protected)/direct-mail/page.tsx` | Add Analytics tab (make it default/first tab) |
| `src/app/(protected)/dashboard/page.tsx` | Add Direct Mail summary section (gated) |

## Files NOT to Modify

Do not touch:
- `src/lib/`, `src/components/ui/`, `src/components/sidebar.tsx`
- Permissions (already updated in D13)
- Any feature module other than `direct-mail`
- Campaigns, inbox, leads, settings pages

---

## Design Specifications

- **Date range filter**: Reuse existing `DateRangeFilter` component. Place at top of analytics tab.
- **Summary cards**: Same `Card` pattern as dashboard. `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` for the 5 cards (total + 4 types).
- **Pivot table**: `Table` component. Status column headers colored to match `PieceStatusBadge` colors. Zero counts shown as `-` in muted text.
- **Delivery funnel bars**: Each bar is a `div` with `bg-blue-600` and `rounded-sm`. Height `h-6`. Width = `(count / maxCount) * 100%`. Labels flanking the bar.
- **Failure reasons**: Sort descending. Use `text-red-400` for reason text. Count right-aligned.
- **Daily trends**: Standard `Table`. Date column left-aligned, numeric columns right-aligned. Alternate row shading for readability.
- **Dashboard section**: Compact 4-card row. "View Direct Mail →" link uses `text-blue-400 hover:text-blue-300` with `ArrowRight` icon.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Analytics tab is the default/first tab on the direct mail page
3. Date range filter works and passes `from_ts`/`to_ts` to the API
4. Summary cards show total pieces + per-type counts
5. Volume pivot table correctly pivots type × status with zero-fills
6. Delivery funnel renders horizontal bars with proportional widths
7. Failure reason breakdown shows sorted reasons with counts
8. Daily trends table displays with proper date formatting
9. Dashboard has a Direct Mail summary section (gated by `direct-mail.view`)
10. Dashboard section shows 4 key metrics + link to direct mail page
11. Dashboard section uses the same date range as other dashboard analytics
12. Loading/empty/error states on all sections
13. All data scoped correctly by role (org_admin sees all, company_admin sees their company)
14. No regressions to existing direct mail piece management or other pages

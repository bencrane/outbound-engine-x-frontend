# Directive #7: Complete Analytics Coverage

## Context

All pages are functional, but 6 analytics/metrics endpoints are not being displayed anywhere. This directive fills those gaps by enhancing the Dashboard and Campaign Detail pages, and wiring up the remaining `useClientAnalytics` hook that was created but never called.

### What's Missing

| Endpoint | Schema | Gap |
|----------|--------|-----|
| `GET /api/analytics/clients` | `ClientAnalyticsRollupItem[]` | Hook exists (`useClientAnalytics`), never called |
| `GET /api/campaigns/{id}/analytics/provider` | `CampaignAnalyticsProviderResponse` | Not hooked or displayed |
| `GET /api/linkedin/campaigns/{id}/metrics` | `LinkedinCampaignMetricsResponse` | Not hooked or displayed |
| `POST /api/email-outreach/workspace/stats` | untyped (request: `{ start_date, end_date }`) | Not hooked |
| `POST /api/email-outreach/workspace/campaign-events/stats` | untyped (request: `{ start_date, end_date, campaign_ids?, inbox_ids? }`) | Not hooked |
| `GET /api/analytics/reliability` | `ReliabilityAnalyticsResponse` | Not hooked |
| `GET /api/analytics/message-sync-health` | `MessageSyncHealthItem[]` | Not hooked |

---

## Plan

### 1. Enhance the Dashboard with three new sections
### 2. Add date range filtering to the Dashboard
### 3. Enhance Campaign Detail Overview with provider analytics
### 4. Add LinkedIn campaign metrics support

---

## New Hooks

### In `src/features/analytics/api.ts` (add to existing file)

#### `useReliabilityAnalytics(filters?)`
```
GET /api/analytics/reliability
Query params: company_id, provider_slug, from_ts, to_ts
Returns: ReliabilityAnalyticsResponse
```
```typescript
{
  company_id: string | null
  events_total: number
  replayed_events_total: number
  replay_count_total: number
  errors_total: number
  by_provider: Array<{
    provider_slug: string
    events_total: number
    replayed_events_total: number
    replay_count_total: number
    errors_total: number
  }>
  from_ts: string | null
  to_ts: string | null
  updated_at: string
}
```
Query key: `["analytics", "reliability", filters]`

#### `useMessageSyncHealth(filters?)`
```
GET /api/analytics/message-sync-health
Query params: company_id, campaign_id, message_sync_status
Returns: MessageSyncHealthItem[]
```
```typescript
{
  company_id: string
  campaign_id: string
  campaign_name: string
  campaign_status: string
  provider_id: string
  message_sync_status: string | null
  last_message_sync_at: string | null
  last_message_sync_error: string | null
  leads_total: number
  messages_total: number
  inbound_total: number
  outbound_total: number
  updated_at: string
}
```
Query key: `["analytics", "message-sync-health", filters]`

#### `useWorkspaceStats(startDate, endDate)`
```
POST /api/email-outreach/workspace/stats
Body: { start_date: string, end_date: string }
Returns: untyped — handle as Record<string, unknown>
```
Query key: `["analytics", "workspace-stats", startDate, endDate]`

Use `useQuery` (not `useMutation`) since this is conceptually a read — it just happens to be a POST because it takes a body. Set `enabled` based on whether dates are provided.

#### `useWorkspaceCampaignEventsStats(startDate, endDate, options?)`
```
POST /api/email-outreach/workspace/campaign-events/stats
Body: { start_date, end_date, campaign_ids?, inbox_ids? }
Returns: untyped — handle as Record<string, unknown>
```
Query key: `["analytics", "workspace-campaign-events", startDate, endDate, options]`

Same pattern as above.

### In `src/features/campaigns/api.ts` (add to existing file)

#### `useCampaignProviderAnalytics(campaignId)`
```
GET /api/campaigns/{campaign_id}/analytics/provider
Returns: CampaignAnalyticsProviderResponse
```
```typescript
{
  campaign_id: string
  provider: string           // e.g. "emailbison"
  provider_campaign_id: string
  normalized: Record<string, unknown>  // provider-normalized metrics
  raw: Record<string, unknown>         // raw provider response
  fetched_at: string
}
```
Query key: `["campaigns", campaignId, "provider-analytics"]`

### In `src/features/leads/api.ts` (add to existing file)

#### `useLinkedinCampaignMetrics(campaignId)`
```
GET /api/linkedin/campaigns/{campaign_id}/metrics
Returns: LinkedinCampaignMetricsResponse
```
```typescript
{
  campaign_id: string
  provider: "heyreach"
  provider_campaign_id: string
  normalized: Record<string, number | null>  // e.g. { connections_sent, messages_sent, replies, ... }
  raw: Record<string, unknown>
  fetched_at: string
}
```
Query key: `["linkedin", campaignId, "metrics"]`

---

## Dashboard Enhancements

### Date Range Filter

Add a date range selector at the top of the dashboard, below the page header. Use two `<Input type="date">` fields (From / To) with preset quick-select buttons: "Last 7 days", "Last 30 days", "Last 90 days", "All time".

When dates are set:
- Pass `from_ts` and `to_ts` to `useCampaignAnalytics()` (it already supports these params)
- Pass `start_date` and `end_date` to `useWorkspaceStats()` and `useWorkspaceCampaignEventsStats()`
- Pass `from_ts` and `to_ts` to `useClientAnalytics()`

Default: "All time" (no date filter — same as current behavior).

Create `src/features/analytics/components/date-range-filter.tsx` for the filter UI.

### New Section: Client Analytics

Add a new section **below** the Campaign Performance table on the dashboard.

**Title**: "Client Performance" (only visible to `org_admin` — gate with `<Gate permission="analytics.view">`)

This shows the per-company analytics rollup from `useClientAnalytics()`. Display as a table:

| Column | Field | Notes |
|--------|-------|-------|
| Company | `company_id` | Map to company name from `useCompanies()` (import from settings API or create a shared hook) |
| Campaigns | `campaigns_total` | Number |
| Leads | `leads_total` | Number |
| Sent | `outbound_messages_total` | Number |
| Replies | `replies_total` | Number |
| Reply Rate | `reply_rate` | Percentage |
| Last Activity | `last_activity_at` | Relative time |

Skeleton loading, empty state, error state as always.

### New Section: Workspace Stats

Add a section below Client Performance.

**Title**: "Workspace Activity"

Display workspace stats and campaign events stats. Since these responses are untyped, render them defensively. Common patterns for workspace stats include totals like emails_sent, emails_opened, bounced, etc. Render whatever key-value pairs come back in a grid of stat cards.

Use the `Card` component with `CardTitle` = key (humanized: `emails_sent` → "Emails Sent") and value = number. Skip null values.

### New Section: System Health (org_admin only)

Add a section at the bottom of the dashboard, gated behind `<Gate permission="analytics.view">`.

**Title**: "System Health"

Two sub-sections:

**Reliability** — from `useReliabilityAnalytics()`:
- Summary stats: Events Total, Errors Total, Replayed Events, Error Rate (computed: `errors_total / events_total`)
- Provider breakdown table: provider_slug, events, errors, replayed, error rate

**Message Sync Health** — from `useMessageSyncHealth()`:
- Table showing per-campaign sync status:

| Column | Field | Notes |
|--------|-------|-------|
| Campaign | `campaign_name` | — |
| Status | `campaign_status` | Badge |
| Sync Status | `message_sync_status` | Badge: green if healthy, red if error, zinc if null |
| Last Sync | `last_message_sync_at` | Relative time |
| Messages | `messages_total` | Number |
| Inbound | `inbound_total` | Number |
| Outbound | `outbound_total` | Number |

If `last_message_sync_error` is present, show it as a red tooltip or expandable text.

---

## Campaign Detail Enhancement

### Provider Analytics Card

Add to `CampaignOverviewTab` — a new `Card` below the Sequence Step Performance section.

**Title**: "Provider Metrics"

Fetch from `useCampaignProviderAnalytics(campaignId)`.

Display:
- Provider name (e.g. "EmailBison", "HeyReach") as a badge
- `fetched_at` — "Last updated: Jan 15, 2026 at 2:30 PM"
- **Normalized metrics**: Render the `normalized` object as a grid of stat cards. Humanize keys (e.g., `emails_sent` → "Emails Sent", `open_rate` → "Open Rate"). Format numbers, format rates as percentages (detect by key name containing "rate").
- **Raw data**: Collapsible section (default collapsed) showing the raw provider JSON in a `<pre>` code block for debugging

### LinkedIn Campaign Metrics

The campaign detail page currently only handles email campaigns. When the campaign's `provider_id` indicates it's a LinkedIn campaign (or check if it exists in the LinkedIn campaigns list), also fetch and display `useLinkedinCampaignMetrics(campaignId)`.

Same rendering pattern as provider analytics: normalized metrics as stat cards, raw data collapsible.

Since the campaign detail page uses a single `useCampaign(campaignId)` hook that hits `GET /api/campaigns/{campaign_id}` (email campaigns), LinkedIn campaigns need detection. The simplest approach: try fetching provider analytics — if it fails or returns a LinkedIn provider, fetch LinkedIn metrics instead. OR: pass a `channel` prop to the overview tab.

For now, just add the `useCampaignProviderAnalytics` call to the overview tab. It will return EmailBison data for email campaigns. For LinkedIn metrics, we'll add that when we build LinkedIn campaign detail pages (future work). The provider analytics card alone covers the immediate gap.

---

## Feature Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| `DateRangeFilter` | `src/features/analytics/components/date-range-filter.tsx` | Date range selector with presets |
| `ClientAnalyticsSection` | `src/features/analytics/components/client-analytics-section.tsx` | Client performance table |
| `WorkspaceStatsSection` | `src/features/analytics/components/workspace-stats-section.tsx` | Workspace activity cards |
| `SystemHealthSection` | `src/features/analytics/components/system-health-section.tsx` | Reliability + message sync |
| `ProviderAnalyticsCard` | `src/features/campaigns/components/provider-analytics-card.tsx` | Provider metrics display |

---

## Shared Company Hook

The client analytics table needs to map `company_id` → company name. `useCompanies()` already exists in `src/features/settings/api.ts`. Rather than duplicating it, **import it directly** from there. This is fine — the settings api file is just a collection of hooks, not tied to the settings page.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/analytics/components/date-range-filter.tsx` | Date range UI |
| `src/features/analytics/components/client-analytics-section.tsx` | Client rollup table |
| `src/features/analytics/components/workspace-stats-section.tsx` | Workspace stats cards |
| `src/features/analytics/components/system-health-section.tsx` | Reliability + sync health |
| `src/features/campaigns/components/provider-analytics-card.tsx` | Provider metrics card |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/analytics/api.ts` | Add 4 new hooks: reliability, message sync health, workspace stats, campaign events stats |
| `src/features/campaigns/api.ts` | Add `useCampaignProviderAnalytics` hook |
| `src/features/leads/api.ts` | Add `useLinkedinCampaignMetrics` hook |
| `src/app/(protected)/dashboard/page.tsx` | Add date range filter, client analytics, workspace stats, system health sections |
| `src/features/campaigns/components/campaign-overview-tab.tsx` | Add provider analytics card |

## Files NOT to Modify

Do not touch:
- `src/lib/` (no changes to api-client, permissions, format, utils, etc.)
- `src/components/` (no new UI components needed)
- `src/app/layout.tsx`, `src/app/(protected)/layout.tsx`, sidebar, gate, route-guard
- Inbox, leads, settings pages
- Campaign list page or campaign detail page (only modify the overview tab component)

---

## Design Specifications

- **Date range filter**: Inline row of inputs + buttons. Use existing `Input` (type="date") and `Button` components. Preset buttons use `variant="secondary"` when inactive, `variant="default"` when active.
- **Stat cards for untyped data**: Use `Card` with humanized key as title, formatted number as value. Grid layout: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
- **Humanize keys**: `snake_case` → "Title Case" (split on `_`, capitalize each word). Format values: integers with comma formatting, rates/percentages with `formatPercent`, dates with `formatDateTime`.
- **System Health section**: Use `Badge variant="success"` for healthy/synced, `Badge variant="destructive"` for errors, `Badge variant="secondary"` for null/unknown.
- **Provider raw data**: `<pre className="mt-4 max-h-64 overflow-auto rounded-md bg-zinc-800 p-4 text-xs text-zinc-300 font-mono">` with a "Show raw data" / "Hide raw data" toggle button.
- **All new sections**: Gated appropriately. System health is `org_admin` only. Client analytics is `org_admin` only (they manage multiple companies). Workspace stats visible to `org_admin` and `company_admin`.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Dashboard has a working date range filter with presets (7d, 30d, 90d, All time)
3. Date filter applies to campaign analytics, client analytics, and workspace stats
4. Client Analytics table shows per-company rollup with company names
5. Workspace Stats section renders dynamic stat cards from untyped API response
6. System Health section shows reliability summary + provider breakdown table
7. Message Sync Health table shows per-campaign sync status with error indicators
8. Campaign Detail Overview tab shows Provider Analytics card with normalized metrics
9. Raw provider data is viewable via collapsible toggle
10. All new sections have loading, empty, and error states
11. System Health and Client Analytics are gated to `org_admin`
12. `useClientAnalytics` hook (previously unused) is now called on the dashboard
13. All 6 previously unused analytics endpoints are now wired up and displayed
14. No regressions to existing dashboard or campaign detail functionality

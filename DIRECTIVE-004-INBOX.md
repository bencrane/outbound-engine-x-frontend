# Directive #4: Inbox Page

## Context

The dashboard and campaigns pages are complete. The inbox is the **most important page for end users** — it's the only page `company_member` (salesperson) users have access to, and it's the primary daily-use view for all roles.

The existing codebase has:
- `useRecentMessages()` hook in `src/features/campaigns/api.ts` (used by dashboard activity feed)
- `useCampaignReplies()` hook (used by campaign detail replies tab)
- `CampaignRepliesTab` component with reply card rendering (can reference for patterns)
- All formatting utilities: `formatRelativeTime`, `formatDateTime`, `formatDate`, `formatNumber`, `formatPercent`
- UI components: Button, Badge, Card, Skeleton, Table, Tabs, DropdownMenu, Input

### API Design Constraint

There is no single "inbox" endpoint. The unified message view is built from:
- `GET /api/campaigns/messages` — org-level message feed with filtering (direction, campaign_id, limit, offset)
- `GET /api/campaigns/{campaign_id}/leads/{lead_id}/messages` — full message thread for a specific lead in a campaign

The inbox groups inbound replies into a list, and clicking one loads the full conversation thread for that lead.

---

## API Endpoints

### Primary: Messages Feed

`GET /api/campaigns/messages` → `OrgCampaignMessageResponse[]`

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

Query params:
- `company_id` — filter by company (optional)
- `all_companies` — boolean, default false
- `campaign_id` — filter by campaign (optional)
- `direction` — "inbound" | "outbound" | null (optional)
- `mine_only` — boolean, default false
- `limit` — 1-500, default 100
- `offset` — default 0

### Thread: Lead Messages

`GET /api/campaigns/{campaign_id}/leads/{lead_id}/messages` → `CampaignMessageResponse[]`

```typescript
{
  id: string
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

### Supporting: Campaigns List (for filter dropdown)

`GET /api/campaigns/` → already hooked up as `useCampaigns()` in `src/features/campaigns/api.ts`

---

## New Hooks to Create

Add to `src/features/inbox/api.ts`:

### `useInboxMessages(filters?)`

Wraps `GET /api/campaigns/messages`. Returns the message feed.

```typescript
interface InboxFilters {
  direction?: "inbound" | "outbound" | null;
  campaign_id?: string | null;
  limit?: number;
  offset?: number;
}
```

Query key: `["inbox", "messages", filters]`

Default behavior: `limit: 100`, no direction filter (show all), no campaign filter.

### `useLeadThread(campaignId, leadId)`

Wraps `GET /api/campaigns/{campaign_id}/leads/{lead_id}/messages`. Returns the full conversation thread for a specific lead.

Query key: `["inbox", "thread", campaignId, leadId]`

Only enabled when both `campaignId` and `leadId` are truthy (so it doesn't fire on initial page load before a message is selected).

---

## What to Build

### Page Layout: Split-Pane Inbox

The inbox uses a **two-panel layout** (email client pattern):

```
┌──────────────────────────────────────────────────────────┐
│ Inbox                                                    │
│ [All ▾] [Inbound ▾] [Outbound ▾]  [Campaign filter ▾]   │
├──────────────────────┬───────────────────────────────────┤
│ Message List (left)  │ Thread Detail (right)             │
│                      │                                   │
│ ┌──────────────────┐ │ ┌───────────────────────────────┐ │
│ │ ● Subject line   │ │ │ ← Outbound · Step 1          │ │
│ │   Body preview   │ │ │   Subject: Quick question     │ │
│ │   2h ago         │ │ │   Hi {{first_name}}...        │ │
│ ├──────────────────┤ │ ├───────────────────────────────┤ │
│ │ ● Subject line   │ │ │ → Inbound · Reply             │ │
│ │   Body preview   │ │ │   Re: Quick question          │ │
│ │   5h ago         │ │ │   Thanks for reaching out...  │ │
│ ├──────────────────┤ │ └───────────────────────────────┘ │
│ │ ...              │ │                                   │
│ └──────────────────┘ │                                   │
└──────────────────────┴───────────────────────────────────┘
```

### Left Panel: Message List

**Width**: Fixed `w-96` (384px) with `border-r border-zinc-800`. Full height within the page.

**Filters** (top of left panel):
- **Direction filter**: Button group with "All", "Inbound", "Outbound". These filter the `direction` query param.
- **Campaign filter**: A `<select>` dropdown populated from `useCampaigns()`. "All Campaigns" is the default. Selecting a campaign filters the `campaign_id` query param.

**Message list items**: Each message in the feed is a clickable row showing:
- Direction dot indicator: green for inbound, blue for outbound, zinc for unknown
- Subject (or "No subject" in muted text)
- Body preview — first ~80 characters, truncated
- Relative timestamp (e.g. "2h ago")
- The selected message has a `bg-zinc-800` highlight

Clicking a message:
1. Sets it as the "selected" message
2. If the message has a `company_campaign_lead_id` and `company_campaign_id`, loads the full thread via `useLeadThread()`
3. If the message has no `company_campaign_lead_id`, just shows the single message in the right panel

**Sorting**: Messages come pre-sorted from the API (most recent first by default). Display them as-is.

**Pagination**: Show a "Load more" button at the bottom if the returned list length equals the limit (indicating there are more messages). Clicking it increases the offset. Use simple offset-based pagination by keeping a running list of loaded messages in local state, appending new pages.

**Empty state**: "No messages found" if the filtered list is empty.

**Loading state**: Show 8 skeleton message list items while loading.

### Right Panel: Thread Detail

**Width**: Flex-1 (fills remaining space).

**No message selected state**: Show a centered placeholder:
```
[Inbox icon]
Select a message to view the conversation
```

**Single message (no lead thread)**: If the selected message has no `company_campaign_lead_id`, display just that message's full content:
- Direction + timestamp header
- Subject
- Full body (whitespace-preserved)

**Full thread**: If the message has a lead ID, fetch and display all messages in the thread chronologically (oldest first). Each message in the thread:

```
┌────────────────────────────────────────────┐
│ → Outbound · Step 1 · Jan 14, 2026 2:30 PM │
│                                            │
│ Subject: Quick question                    │
│                                            │
│ Hi Alice,                                  │
│                                            │
│ I noticed your team at Delta Corp is...    │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ ← Inbound · Jan 15, 2026 10:15 AM          │
│                                            │
│ Subject: Re: Quick question                │
│                                            │
│ Thanks for reaching out. We'd be           │
│ interested in learning more about...       │
└────────────────────────────────────────────┘
```

- Messages are in **chronological order** (oldest first) — this is natural for reading a conversation
- Each message is a card with: direction icon + label, sequence step (if outbound), formatted datetime, subject, full body
- Inbound messages get a subtle left border accent: `border-l-2 border-emerald-500`
- Outbound messages get: `border-l-2 border-blue-500`
- The thread panel should auto-scroll to the bottom (most recent message) on load

**Thread loading state**: Show 3 skeleton message cards.

**Thread error state**: "Failed to load conversation" inline message.

---

## Feature Components

Place inbox-specific components in `src/features/inbox/components/`:

| Component | File | Purpose |
|-----------|------|---------|
| `InboxMessageList` | `inbox-message-list.tsx` | Left panel: message list with selection |
| `InboxMessageItem` | `inbox-message-item.tsx` | Individual message row in the list |
| `InboxThreadView` | `inbox-thread-view.tsx` | Right panel: thread detail |
| `InboxThreadMessage` | `inbox-thread-message.tsx` | Individual message card in the thread |
| `InboxFilters` | `inbox-filters.tsx` | Filter controls (direction + campaign) |

---

## Design Specifications

- **Page-level layout**: The inbox is a full-height page. Unlike other pages that use `p-8`, the inbox should use `h-full` to fill the available viewport. The left panel scrolls independently from the right panel (`overflow-y-auto` on each).
- **Left panel**: `w-96 border-r border-zinc-800 bg-zinc-950 flex flex-col`. The filter bar is sticky at the top.
- **Right panel**: `flex-1 bg-zinc-950 overflow-y-auto`. Padding `p-6`.
- **Message list items**: `px-4 py-3 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/50`. Selected: `bg-zinc-800`.
- **Thread message cards**: `rounded-lg border border-zinc-800 p-4` with the colored left border accent.
- **Direction indicators**: Green (`text-emerald-400`) for inbound, blue (`text-blue-400`) for outbound.
- **No new colors** beyond what the app already uses.
- **Responsive**: On screens below `lg` (1024px), hide the right panel and show only the list. When a message is selected on mobile, show the thread view full-width with a back button. Use a simple state toggle for this — no complex routing.

---

## Role Behavior

- **`org_admin`**: Sees all messages across all companies. The filters should default with `mine_only: false`.
- **`company_admin`**: Sees their company's messages. API scopes automatically via JWT.
- **`company_member`**: Sees their messages. This is their **only page** (the sidebar only shows Inbox for them). The `mine_only` param should be `true` for this role so they see only messages from campaigns they're assigned to.

Read the user's role from `useAuth()` and set the appropriate default filters.

---

## New UI Component

### `src/components/ui/select.tsx`

A native HTML `<select>` styled to match the dark theme:
- `bg-zinc-800 border-zinc-700 text-white`
- `focus:border-blue-500 focus:ring-1 focus:ring-blue-500`
- Extends `ComponentProps<"select">` with `cn()` for className merging
- Same pattern as the Input component

This is for the campaign filter dropdown. Keep it simple — a styled native `<select>`, not a custom combobox.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/select.tsx` | Styled native select |
| `src/features/inbox/components/inbox-message-list.tsx` | Left panel message list |
| `src/features/inbox/components/inbox-message-item.tsx` | Individual message row |
| `src/features/inbox/components/inbox-thread-view.tsx` | Right panel thread view |
| `src/features/inbox/components/inbox-thread-message.tsx` | Thread message card |
| `src/features/inbox/components/inbox-filters.tsx` | Filter controls |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/inbox/api.ts` | Replace placeholder with real hooks |
| `src/app/(protected)/inbox/page.tsx` | Complete rewrite — split-pane inbox |

## Files NOT to Modify

Do not touch:
- `src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/api.ts`
- `src/lib/permissions.ts`, `src/lib/auth-context.tsx`, `src/lib/format.ts`
- `src/components/providers.tsx`, `src/components/sidebar.tsx`
- `src/components/gate.tsx`, `src/components/route-guard.tsx`
- `src/app/layout.tsx`, `src/app/(protected)/layout.tsx`
- `src/features/campaigns/api.ts`, `src/features/analytics/api.ts`
- Dashboard, campaigns, leads, or settings pages
- Any existing UI components in `src/components/ui/`

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. `/inbox` shows a two-panel layout: message list on left, thread on right
3. Direction filter (All/Inbound/Outbound) filters the message list
4. Campaign filter dropdown populates from the campaigns list and filters messages
5. Clicking a message selects it (visual highlight) and loads the thread in the right panel
6. Thread view shows all messages in chronological order with direction-colored left borders
7. Thread auto-scrolls to the most recent message
8. "Load more" pagination works at the bottom of the message list
9. Empty states: "No messages found" (list), "Select a message" (no selection)
10. Loading states: skeletons for both list and thread
11. Error states: inline error messages
12. `org_admin` sees all messages, `company_member` sees `mine_only: true`
13. `RouteGuard` with `inbox.view` permission is preserved
14. Responsive: on small screens, list and thread toggle (not side-by-side)
15. The left panel scroll is independent from the right panel scroll

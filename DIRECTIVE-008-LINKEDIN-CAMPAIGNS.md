# Directive #8: LinkedIn Campaign Integration

## Context

The campaigns system currently only handles email campaigns. LinkedIn campaigns exist in the API with a parallel set of endpoints (`/api/linkedin/campaigns/...`) and identical data shapes. This directive integrates LinkedIn campaigns into the existing campaigns UI so users see a unified multi-channel view.

### What Exists

**Hooks already built** (in `src/features/leads/api.ts`):
- `useLinkedinCampaigns()` — lists LinkedIn campaigns
- `useLinkedinCampaignLeads(campaignId)` — lists leads for a LinkedIn campaign
- `useLinkedinCampaignMetrics(campaignId)` — fetches HeyReach metrics (hooked but not displayed)

**Current campaigns pages:**
- `/campaigns` — lists only email campaigns from `GET /api/campaigns/`
- `/campaigns/[id]` — detail page that only calls email campaign APIs

**Key insight:** `LinkedinCampaignResponse` and `CampaignResponse` have identical shapes (id, company_id, provider_id, name, status, created_at, updated_at). Same for leads. This means we can merge them into a unified view with a channel indicator.

### LinkedIn API Differences from Email

| Feature | Email API | LinkedIn API |
|---------|-----------|-------------|
| List campaigns | `GET /api/campaigns/` | `GET /api/linkedin/campaigns/` |
| Get campaign | `GET /api/campaigns/{id}` | `GET /api/linkedin/campaigns/{id}` |
| Status change | `POST /api/campaigns/{id}/status` body: `{ status }` | `POST /api/linkedin/campaigns/{id}/action` body: `{ action: "pause" \| "resume" }` |
| List leads | `GET /api/campaigns/{id}/leads` | `GET /api/linkedin/campaigns/{id}/leads` |
| Lead actions | pause/resume/unsubscribe endpoints | `POST .../leads/{id}/status` body: `{ status }` |
| Send message | N/A | `POST .../leads/{id}/messages` body: `{ message }` |
| Sequence | `GET /api/campaigns/{id}/sequence` | N/A (LinkedIn campaigns don't have email sequences) |
| Schedule | `GET /api/campaigns/{id}/schedule` | N/A |
| Replies | `GET /api/campaigns/{id}/replies` | N/A (messages are via lead-level messaging) |
| Analytics | Summary + Provider + Sequence Steps | Metrics only (`GET .../metrics`) |

---

## New Hooks

### Move LinkedIn hooks to `src/features/campaigns/api.ts`

The LinkedIn campaign hooks are currently in `src/features/leads/api.ts` because that's where they were needed for the leads page. They belong in the campaigns feature. **Move** `useLinkedinCampaigns` and `useLinkedinCampaignLeads` from `src/features/leads/api.ts` to `src/features/campaigns/api.ts`. Update the import in `src/features/leads/api.ts` (and `src/app/(protected)/leads/page.tsx`) to import from the new location.

Also move `useLinkedinCampaignMetrics` from `src/features/leads/api.ts` to `src/features/campaigns/api.ts`.

### New hooks to add in `src/features/campaigns/api.ts`

#### `useLinkedinCampaign(campaignId)`
```
GET /api/linkedin/campaigns/{campaign_id}
Returns: LinkedinCampaignResponse
```
Query key: `["linkedin", "campaigns", campaignId]`

#### `useLinkedinCampaignAction()`
```
POST /api/linkedin/campaigns/{campaign_id}/action
Body: { action: "pause" | "resume" }
Returns: LinkedinCampaignResponse
```
Mutation. Invalidates `["linkedin", "campaigns"]` queries on success.

#### `useLinkedinLeadStatusUpdate()`
```
POST /api/linkedin/campaigns/{campaign_id}/leads/{lead_id}/status
Body: { status: "pending" | "contacted" | "replied" | "connected" | "not_interested" | "bounced" }
Returns: CampaignLeadMutationResponse
```
Mutation. Invalidates `["linkedin", campaignId, "leads"]` on success.

#### `useSendLinkedinMessage()`
```
POST /api/linkedin/campaigns/{campaign_id}/leads/{lead_id}/messages
Body: { message: string, template_id?: string }
Returns: CampaignMessageResponse
```
Mutation. This enables direct LinkedIn messaging from the lead detail.

---

## Campaigns List Page Enhancement

### Merge Email + LinkedIn Campaigns

The campaigns list page (`/campaigns`) should show both email and LinkedIn campaigns in a single unified table.

**Data merging approach:**

```typescript
interface UnifiedCampaign {
  id: string;
  name: string;
  status: "DRAFTED" | "ACTIVE" | "PAUSED" | "STOPPED" | "COMPLETED";
  channel: "email" | "linkedin";
  created_at: string;
  updated_at: string;
}
```

Fetch both `useCampaigns()` and `useLinkedinCampaigns()` in parallel, normalize into `UnifiedCampaign[]`, merge and sort by `updated_at` descending.

### New table column: Channel

Add a "Channel" column between Name and Status:

| Column | Notes |
|--------|-------|
| Name | Clickable link — route depends on channel (see below) |
| Channel | Badge: "Email" (blue/default) or "LinkedIn" (secondary) |
| Status | Badge (unchanged) |
| Created | Date |
| Updated | Relative time |

### New filter: Channel

Add a channel filter button group (alongside existing status filter):
- "All Channels", "Email", "LinkedIn"

This filters client-side, same as the status filter.

### Detail page routing

Campaign links should route to `/campaigns/[id]?channel=email` or `/campaigns/[id]?channel=linkedin`. The detail page uses this query param to know which API to call.

Alternatively, use a simpler approach: store the channel in the URL path. Since we already have `/campaigns/[id]`, use a query param `?channel=linkedin` to differentiate. The default (no param) is email, preserving backward compatibility with existing dashboard links.

---

## Campaign Detail Page Enhancement

### Channel-Aware Fetching

The detail page at `/campaigns/[id]` should read the `channel` query param:
- If `channel=linkedin`: use `useLinkedinCampaign(id)` instead of `useCampaign(id)`
- Default (no param or `channel=email`): use `useCampaign(id)` as today

### Channel-Aware Status Actions

For LinkedIn campaigns, the status mutation uses `useLinkedinCampaignAction()` instead of `useUpdateCampaignStatus()`. The LinkedIn API only supports `pause` and `resume` actions (not arbitrary status setting):
- If ACTIVE → show "Pause"
- If PAUSED → show "Resume"
- DRAFTED, STOPPED, COMPLETED → no actions

### Channel-Aware Tabs

| Tab | Email | LinkedIn |
|-----|-------|---------|
| Overview | Campaign summary + sequence step perf + provider analytics | LinkedIn metrics (normalized stats) |
| Leads | Email leads table with pause/resume/unsubscribe | LinkedIn leads table with status update + send message |
| Sequence | Email sequence steps + schedule | **Hidden** (LinkedIn has no sequence concept) |
| Replies | Email replies list | **Hidden** (LinkedIn doesn't have a replies endpoint) |

So for LinkedIn campaigns, only show "Overview" and "Leads" tabs.

### LinkedIn Overview Tab

Create `src/features/campaigns/components/linkedin-overview-tab.tsx`:

Fetches `useLinkedinCampaignMetrics(campaignId)`.

The `normalized` field is a `Record<string, number | null>` with provider-specific keys from HeyReach. Render as a grid of stat cards (same pattern as the provider analytics card):
- Humanize keys: `connections_sent` → "Connections Sent"
- Format numbers with `formatNumber()`
- Skip null values
- Show `fetched_at` as "Last updated: ..."

Also show the raw data in a collapsible `<pre>` block.

### LinkedIn Leads Tab

Create `src/features/campaigns/components/linkedin-leads-tab.tsx`:

Similar to `CampaignLeadsTab` but uses LinkedIn-specific hooks:
- `useLinkedinCampaignLeads(campaignId)` for the data
- `useLinkedinLeadStatusUpdate()` for status changes
- `useSendLinkedinMessage()` for messaging

**Table columns**: Same as email leads (Name, Email, Company, Title, Status, Actions).

**Actions dropdown** for LinkedIn leads:
- Status updates: set to contacted, replied, connected, not_interested, bounced
- "Send Message" action → opens a simple inline form (text input + Send button) below the leads table or in an expanded row

**Send Message UI**: When "Send Message" is clicked from the dropdown:
1. Set a `messagingLeadId` state
2. Show an inline message compose area below the table (or as an expanded row, same pattern as the leads page detail panel)
3. Text input for the message body + Send button
4. On success, clear the input and show a brief success message

---

## Feature Components

| Component | File | Purpose |
|-----------|------|---------|
| `LinkedinOverviewTab` | `src/features/campaigns/components/linkedin-overview-tab.tsx` | LinkedIn metrics display |
| `LinkedinLeadsTab` | `src/features/campaigns/components/linkedin-leads-tab.tsx` | LinkedIn leads with status + messaging |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/campaigns/components/linkedin-overview-tab.tsx` | LinkedIn campaign overview |
| `src/features/campaigns/components/linkedin-leads-tab.tsx` | LinkedIn leads with actions |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/campaigns/api.ts` | Move LinkedIn hooks here + add new hooks (useLinkedinCampaign, useLinkedinCampaignAction, useLinkedinLeadStatusUpdate, useSendLinkedinMessage) |
| `src/features/leads/api.ts` | Remove LinkedIn hooks (moved to campaigns), re-export or update imports |
| `src/app/(protected)/leads/page.tsx` | Update imports for moved hooks |
| `src/app/(protected)/campaigns/page.tsx` | Merge email + LinkedIn campaigns, add channel column + filter |
| `src/app/(protected)/campaigns/[id]/page.tsx` | Channel-aware fetching, status actions, and tab rendering |

## Files NOT to Modify

Do not touch:
- `src/lib/` (no changes)
- `src/components/` (no new UI components needed)
- Dashboard, inbox, settings pages
- Existing email campaign tab components (CampaignOverviewTab, CampaignLeadsTab, CampaignSequenceTab, CampaignRepliesTab)
- `src/features/analytics/`, `src/features/inbox/`, `src/features/settings/`

---

## Design Specifications

- **Channel badge**: Same as leads page — Email = `variant="default"` (blue), LinkedIn = `variant="secondary"` (zinc).
- **LinkedIn metrics cards**: Same grid layout as provider analytics card. Humanized keys, formatted values.
- **Send Message form**: Inline below the leads table when active. `Textarea` for the message, `Button` to send. Show the target lead's name above the textarea. Cancel button to dismiss.
- **Tab visibility**: Simply don't render Sequence and Replies `TabsTrigger` + `TabsContent` for LinkedIn campaigns. Clean conditional.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. `/campaigns` shows both email AND LinkedIn campaigns in a unified table
3. Channel column shows "Email" or "LinkedIn" badge per campaign
4. Channel filter (All/Email/LinkedIn) works
5. Clicking a LinkedIn campaign navigates to `/campaigns/{id}?channel=linkedin`
6. Campaign detail page fetches from the correct API based on channel
7. LinkedIn detail shows only Overview and Leads tabs (no Sequence, no Replies)
8. LinkedIn Overview tab displays HeyReach metrics as stat cards
9. LinkedIn Leads tab shows leads with status update actions
10. Send Message action opens inline compose and sends via API
11. LinkedIn status actions show Pause/Resume (not full status list)
12. Existing email campaign flows are completely unchanged
13. Leads page still works after hook relocation (imports updated)
14. `useLinkedinCampaignMetrics` is now displayed (was hooked but unused)
15. All loading/empty/error states handled

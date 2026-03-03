# Directive #22: Fix Inbox company_id Propagation

## Context

This is a Next.js 16 / React 19 / TypeScript frontend. The inbox page at `src/app/(protected)/inbox/page.tsx` shows "Failed to load messages" for org-level admin users because the messages API endpoint requires either `company_id` or `all_companies=true` for org-level callers (`company_id: null` in JWT).

The company context switcher (`src/lib/company-context.tsx`) provides `useCompanyFilters()` which returns `{ company_id: "..." }` when a company is selected or `{ all_companies: true, mine_only: false }` for "All Companies" mode. The inbox page spreads these filters into `useInboxMessages()` — but the `InboxFilters` interface in `src/features/inbox/api.ts` does not include a `company_id` field, so it's silently dropped and never sent to the API.

### Root Cause

`src/features/inbox/api.ts`:
- `InboxFilters` interface has `direction`, `campaign_id`, `limit`, `offset`, `mine_only`, `all_companies` — but **no `company_id`**
- The `queryFn` in `useInboxMessages()` conditionally adds each filter field to the API query object, but has no block for `company_id`
- Result: when an org_admin has a company selected, `company_id` is in the spread filters object but never reaches the API call

### Verified API Behavior (via curl)

```
GET /api/campaigns/messages (no params)           → "company_id is required for org-level callers"
GET /api/campaigns/messages?mine_only=false        → "company_id is required for org-level callers"  
GET /api/campaigns/messages?all_companies=true     → [] (works — empty, no data yet)
GET /api/campaigns/messages?company_id=<id>        → [] (works — empty, no data yet)
```

**Read every file listed below before modifying.**

---

## Fix

### 1. Update `InboxFilters` in `src/features/inbox/api.ts`

Add `company_id` to the `InboxFilters` interface:

```typescript
export interface InboxFilters {
  direction?: MessageDirection;
  campaign_id?: string | null;
  company_id?: string;          // ← add this
  limit?: number;
  offset?: number;
  mine_only?: boolean;
  all_companies?: boolean;
}
```

### 2. Update the query builder in `useInboxMessages()`

In the `queryFn`, add a block to pass `company_id` to the API query — same pattern as the existing `campaign_id`, `mine_only`, and `all_companies` blocks:

```typescript
if (filters?.company_id !== undefined) {
  query.company_id = filters.company_id;
}
```

Place it alongside the other filter assignments, before `mine_only`.

### 3. Verify the inbox page passes filters correctly

Read `src/app/(protected)/inbox/page.tsx` and confirm that `useCompanyFilters()` output flows through `sharedRoleFilters` into `inboxFilters` and reaches `useInboxMessages(inboxFilters)`. No changes should be needed here — the spread already includes `company_id` from `useCompanyFilters()`, it was just being dropped by the hook.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/features/inbox/api.ts` | Add `company_id` to `InboxFilters` + add query builder block |

## Files NOT to Modify

Do not touch any other file.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Inbox loads without error when a company is selected in the context switcher
3. Inbox loads without error in "All Companies" mode (uses `all_companies=true`)
4. Inbox loads without error for `company_member` users (`mine_only=true`)
5. No regressions to message filtering (direction, campaign filters still work)

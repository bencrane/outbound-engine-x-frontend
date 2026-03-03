# Directive #18: Fix company_id Propagation for Org-Level Callers

## Context

This is a Next.js 16 / React 19 / TypeScript frontend. The logged-in user is an `org_admin` with `company_id: null` in their JWT. Three backend endpoints require `company_id` as a query parameter for org-level callers — they return `{"detail":"company_id is required for org-level callers"}` without it.

A company context switcher exists at `src/lib/company-context.tsx` that provides:
- `useCompanyContext()` → `{ selectedCompanyId, companies, ... }`
- `useCompanyFilters()` → `{ company_id?, all_companies?, mine_only? }`

The problem: three endpoint call sites don't consume company context, so they never pass `company_id`.

**DO NOT change any other files besides those listed. Read each file before modifying.**

---

## Failing Endpoints

| Endpoint | Error | Used By |
|----------|-------|---------|
| `GET /api/linkedin/campaigns/` | "company_id is required for org-level callers" | `useLinkedinCampaigns()` in `src/features/campaigns/api.ts` — already accepts filter params and IS correctly called with company filters from campaigns + leads pages. BUT the hook itself works fine; the issue is only when called without filters. Verify all call sites. |
| `GET /api/inboxes/` | "company_id is required for org-level callers" | `useInboxes()` in `src/features/settings/api.ts` — takes NO params, never passes company_id |
| `GET /api/direct-mail/{type}` | "company_id is required for org-level callers" | `useDirectMailPieces()` in `src/features/direct-mail/api.ts` — takes only `pieceType`, never passes company_id |

---

## Fix 1: `useInboxes()` — Add company_id support

**File**: `src/features/settings/api.ts`

The `useInboxes()` hook currently takes no arguments and calls `GET /api/inboxes/` with no query params.

**Change**: Make it accept an optional `company_id` parameter:

```typescript
export function useInboxes(companyId?: string) {
  return useQuery({
    queryKey: ["settings", "inboxes", companyId ?? "all"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/inboxes/", {
        params: {
          query: companyId ? { company_id: companyId } : undefined,
        },
      });
      if (error) throw new Error("Failed to load inboxes.");
      return data ?? [];
    },
  });
}
```

**Then update the call site** in `src/features/settings/components/settings-sender-accounts-tab.tsx`:

This component needs to read company context and pass the selected company ID. For org_admin in "All Companies" mode, fetch inboxes for ALL companies by making parallel queries (one per company using `useQueries`), OR simply show a message requiring company selection for the inboxes view.

**Recommended approach**: In "All Companies" mode, iterate over all companies with `useQueries` and merge results (same pattern as the leads page). This gives a complete view. Add the `company_id` to each inbox result so you know which company it belongs to.

Import `useCompanyContext` and `useCompanyFilters` from `@/lib/company-context`. Import `useCompanies` from `@/lib/hooks`.

If `selectedCompanyId` is set: call `useInboxes(selectedCompanyId)` — single query.
If `selectedCompanyId` is null (All Companies): use `useQueries` to fetch inboxes for each company from `companies` list, merge the results.

---

## Fix 2: `useDirectMailPieces()` — Add company_id support

**File**: `src/features/direct-mail/api.ts`

The `useDirectMailPieces()` hook takes only `pieceType` and never passes `company_id` to the API.

**Change**: Add an optional `companyId` parameter:

```typescript
export function useDirectMailPieces(pieceType: PieceType, companyId?: string) {
  return useQuery({
    queryKey: ["direct-mail", pieceType, "list", companyId ?? "all"],
    queryFn: async () => {
      const response = await fetchDirectMailList(pieceType, companyId);
      // ... rest unchanged
    },
  });
}
```

Update the internal `fetchDirectMailList` helper functions to accept and pass `company_id` as a query param.

**Then update the call site** in `src/features/direct-mail/components/piece-list.tsx`:

The `PieceList` component receives `pieceType` as a prop. It needs to also read company context.

Import `useCompanyContext` and `useCompanies` from their respective locations.

If `selectedCompanyId` is set: call `useDirectMailPieces(pieceType, selectedCompanyId)`.
If `selectedCompanyId` is null (All Companies): use `useQueries` over all companies, merge the `pieces` arrays.

**Also update `src/app/(protected)/direct-mail/page.tsx`**: No change needed to the page itself — the `PieceList` component handles its own data fetching.

---

## Fix 3: Verify `useLinkedinCampaigns()` call sites

**File**: `src/features/campaigns/api.ts`

The `useLinkedinCampaigns()` hook already accepts filter params. Check that every call site passes company context:

- `src/app/(protected)/campaigns/page.tsx` — should already pass `companyFilters` via `toCampaignScopedFilters()`. **Verify this is working.**
- `src/app/(protected)/leads/page.tsx` — same. **Verify.**
- Any other call sites.

If all call sites already pass `company_id` when a company is selected, and `all_companies: true` when no company is selected — but the API still rejects `all_companies` without `company_id` — then the hook needs to handle "All Companies" mode differently for LinkedIn campaigns.

**Check**: Does `GET /api/linkedin/campaigns/?all_companies=true` work? Or does it require `company_id` regardless?

Test with curl:
```bash
curl -s "https://api.outboundengine.dev/api/linkedin/campaigns/?all_companies=true" -H "Authorization: Bearer $TOKEN"
```

If `all_companies=true` doesn't work for LinkedIn campaigns, the "All Companies" mode needs to iterate over companies with `useQueries` (same as inboxes fix above). Apply the same pattern in the campaigns list page and leads page for the LinkedIn campaigns fetch.

---

## Testing

After making changes, verify with these curl commands that the frontend will now send correct params:

```bash
TOKEN="<get fresh token from POST /api/auth/login with email: team@outboundsolutions.com password: OEX-Admin-2026!>"
NEXUS_ID="69a9ffab-d8af-4e3c-9d6a-3d2added669f"

# These should all return data (empty arrays are fine):
curl -s "https://api.outboundengine.dev/api/inboxes/?company_id=$NEXUS_ID" -H "Authorization: Bearer $TOKEN"
curl -s "https://api.outboundengine.dev/api/direct-mail/postcards?company_id=$NEXUS_ID" -H "Authorization: Bearer $TOKEN"
curl -s "https://api.outboundengine.dev/api/linkedin/campaigns/?company_id=$NEXUS_ID" -H "Authorization: Bearer $TOKEN"
```

Then run `npm run build` to verify zero TypeScript errors.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/features/settings/api.ts` | Add `companyId` param to `useInboxes()` |
| `src/features/settings/components/settings-sender-accounts-tab.tsx` | Read company context, pass to `useInboxes()`, handle "All Companies" with parallel queries |
| `src/features/direct-mail/api.ts` | Add `companyId` param to `useDirectMailPieces()` and internal fetch helpers |
| `src/features/direct-mail/components/piece-list.tsx` | Read company context, pass to `useDirectMailPieces()`, handle "All Companies" with parallel queries |

Potentially (if LinkedIn `all_companies` doesn't work):
| `src/app/(protected)/campaigns/page.tsx` | Handle LinkedIn campaigns "All Companies" with parallel queries |
| `src/app/(protected)/leads/page.tsx` | Same |

## Files NOT to Modify

Do not touch `src/lib/`, `src/components/`, dashboard page, inbox page, campaign detail page, or any other files.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Inboxes load when a company is selected in the context switcher
3. Inboxes load in "All Companies" mode (merged from all companies)
4. Direct mail piece lists load when a company is selected
5. Direct mail piece lists load in "All Companies" mode
6. LinkedIn campaigns load correctly in both modes
7. No "company_id is required" errors on any page
8. No regressions to any existing functionality

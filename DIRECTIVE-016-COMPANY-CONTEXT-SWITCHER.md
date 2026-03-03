# Directive #16: Company Context Switcher

## Context

This is a Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 app. It serves as an agency-model platform where an `org_admin` manages multiple client companies. Currently, every page independently checks the user's role and constructs filter objects (`company_id`, `all_companies`, `mine_only`) to scope API data. There's no way to "select a client" and have the entire app scope to that context.

This directive adds a **Company Context Switcher** — a dropdown in the sidebar that lets `org_admin` users select a specific client company (or "All Companies") and have every page automatically scope its data to that selection.

### How it works today (to be replaced)

Every page has its own inline filter logic:
```typescript
// Dashboard, campaigns, leads, inbox all do this independently:
const isOrgAdmin = user?.role === "org_admin";
const orgAdminFilters = isOrgAdmin ? { mine_only: false, all_companies: true } : undefined;
```

This means `org_admin` always sees ALL data across ALL companies. There's no way to focus on a single client.

### How it should work after this directive

1. A `CompanyContext` provider stores `selectedCompanyId: string | null`
2. `null` = "All Companies" (global view — current behavior)
3. A specific ID = that company only
4. A `useCompanyContext()` hook provides `{ selectedCompanyId, setSelectedCompanyId, selectedCompany }`
5. A `useCompanyFilters()` hook returns the correct API filter object based on context + user role
6. Every page uses `useCompanyFilters()` instead of inline role-checking logic
7. The sidebar shows a dropdown to switch companies
8. Selection persists to `localStorage` and survives page refresh

---

## Step 1: Create Company Context

Create `src/lib/company-context.tsx`:

```typescript
interface CompanyContextType {
  selectedCompanyId: string | null;       // null = "All Companies"
  setSelectedCompanyId: (id: string | null) => void;
  selectedCompany: Company | null;        // resolved company object, null when "All"
  companies: Company[];                   // full list for the dropdown
  isLoading: boolean;                     // true while companies are loading
}
```

**Implementation:**
- Uses React context + `useState`
- Fetches companies via `useCompanies()` from `@/lib/hooks`
- On mount, reads `localStorage.getItem("selectedCompanyId")` to restore previous selection
- On change, writes to `localStorage`
- If the stored company ID no longer exists in the companies list (deleted company), reset to `null`
- `selectedCompany` is derived by finding the company object matching `selectedCompanyId`
- Only relevant for `org_admin` — for other roles, `selectedCompanyId` is always `null` and the dropdown is hidden (the API scopes via JWT automatically)

### `useCompanyFilters()` hook

Also in `src/lib/company-context.tsx`, export a convenience hook:

```typescript
interface CompanyFilters {
  company_id?: string;
  all_companies?: boolean;
  mine_only?: boolean;
}

function useCompanyFilters(): CompanyFilters
```

Logic:
- If user is NOT `org_admin`: return `{}` (let JWT handle scoping)
- If user is `org_admin` AND `selectedCompanyId` is `null`: return `{ all_companies: true, mine_only: false }` (global view — same as current behavior)
- If user is `org_admin` AND `selectedCompanyId` is set: return `{ company_id: selectedCompanyId, mine_only: false }` (scoped to that client)

This single hook replaces all the scattered `const isOrgAdmin = ...` + `orgAdminFilters` logic across every page.

---

## Step 2: Wire Into Providers

Update `src/components/providers.tsx`:

Wrap children with `CompanyProvider` (inside `AuthProvider` so auth is available, inside `QueryClientProvider` so queries work):

```
QueryClientProvider
  └── AuthProvider
       └── CompanyProvider
            └── {children}
```

---

## Step 3: Add Dropdown to Sidebar

Update `src/components/sidebar.tsx`:

Add a company switcher dropdown between the header ("Outbound Engine") and the nav items. Only visible when `user.role === "org_admin"`.

```
┌─────────────────────┐
│ Outbound Engine      │
├─────────────────────┤
│ [Acme Corp       ▾] │  ← company switcher (org_admin only)
├─────────────────────┤
│ Dashboard            │
│ Campaigns            │
│ ...                  │
```

**Implementation:**
- Use a native `<select>` (same `Select` component from `src/components/ui/select.tsx`) styled to fit the sidebar width
- Options: "All Companies" (value `""`) + each company from `useCompanyContext()`
- On change: call `setSelectedCompanyId(value || null)`
- Show a small label above: `text-xs text-zinc-500` with "Client" or "Workspace"
- When a company is selected, show the company name prominently. When "All Companies", show "All Companies" in muted text.
- While companies are loading, show a `Skeleton` placeholder

---

## Step 4: Update Every Page to Use `useCompanyFilters()`

Replace all inline `org_admin` filter logic with the centralized hook.

### `src/app/(protected)/dashboard/page.tsx`

**Current pattern (remove):**
```typescript
const isOrgAdmin = user?.role === "org_admin";
const orgAdminFilters = { ...(user?.role === "org_admin" ? { mine_only: false } : {}) };
```

**New pattern:**
```typescript
const companyFilters = useCompanyFilters();
const { selectedCompanyId } = useCompanyContext();
const isGlobalView = selectedCompanyId === null && user?.role === "org_admin";
```

Then pass `companyFilters` (spread into the query options) to:
- `useCampaignAnalytics({ ...companyFilters, ...dateFilters })`
- `useClientAnalytics(isGlobalView ? { ...companyFilters, ...dateFilters } : undefined)` — client analytics only shown in global view
- `useReliabilityAnalytics(...)` — only in global view
- `useMessageSyncHealth(...)` — only in global view
- `useRecentMessages({ ...companyFilters })`
- `useWorkspaceStats(...)` and `useWorkspaceCampaignEventsStats(...)`
- Direct mail dashboard section analytics

**Visibility changes:**
- Client Analytics section: only show when `isGlobalView` (no point showing per-company rollup when already scoped to one company)
- System Health section: only show when `isGlobalView`
- Everything else: shows in both views, just scoped differently

### `src/app/(protected)/campaigns/page.tsx`

**Current:** `const orgAdminFilters = user?.role === "org_admin" ? { mine_only: false } : undefined;`

**New:**
```typescript
const companyFilters = useCompanyFilters();
// Pass to useCampaigns and useLinkedinCampaigns
const { data: emailCampaigns } = useCampaigns(companyFilters);
const { data: linkedinCampaigns } = useLinkedinCampaigns(companyFilters);
```

### `src/app/(protected)/inbox/page.tsx`

**Current:** Complex `useMemo` with `isOrgAdmin`, `isCompanyMember` checks.

**New:**
```typescript
const companyFilters = useCompanyFilters();
const isCompanyMember = user?.role === "company_member";

const sharedRoleFilters = useMemo(() => {
  if (isCompanyMember) return { mine_only: true };
  return { ...companyFilters };
}, [isCompanyMember, companyFilters]);
```

The `company_member` special case stays (they only see their own messages), but the `org_admin` vs `company_admin` distinction is now handled by the context.

### `src/app/(protected)/leads/page.tsx`

**Current:** `const orgAdminFilters = user?.role === "org_admin" ? { mine_only: false, all_companies: true } : undefined;`

**New:**
```typescript
const companyFilters = useCompanyFilters();
const { data: emailCampaigns } = useCampaigns(companyFilters);
const { data: linkedinCampaigns } = useLinkedinCampaigns(companyFilters);
```

### `src/features/direct-mail/components/analytics-tab.tsx`

**Current:** Inline `isOrgAdmin` check + company_id construction.

**New:**
```typescript
const companyFilters = useCompanyFilters();
const analyticsFilters = useMemo(() => ({
  ...companyFilters,
  ...(fromTs ? { from_ts: fromTs } : {}),
  ...(toTs ? { to_ts: toTs } : {}),
}), [companyFilters, fromTs, toTs]);
```

### `src/features/direct-mail/components/dashboard-section.tsx`

Same pattern — replace inline `isOrgAdmin` + `company_id` with `useCompanyFilters()`.

### `src/app/(protected)/direct-mail/page.tsx`

If this page passes company filters to anything, update it. Otherwise no change needed.

---

## Step 5: Show Context Indicator on Pages

Add a subtle context indicator below each page title showing which company is selected. This prevents confusion about what data you're looking at.

When a specific company is selected, each page header shows:

```
Dashboard
Overview of your outreach performance
Viewing: Acme Corp                        ← new line, text-zinc-500
```

When "All Companies":
```
Dashboard
Overview of your outreach performance
Viewing: All Companies                    ← muted
```

Add this to each page header area. Use `useCompanyContext()` to get the company name.

Only show for `org_admin` (other roles don't have the switcher, so it would be confusing).

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/company-context.tsx` | CompanyContext + CompanyProvider + useCompanyContext + useCompanyFilters |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/providers.tsx` | Add CompanyProvider to the provider tree |
| `src/components/sidebar.tsx` | Add company switcher dropdown (org_admin only) |
| `src/app/(protected)/dashboard/page.tsx` | Replace inline org_admin filters with useCompanyFilters, add context indicator, conditionally show global-only sections |
| `src/app/(protected)/campaigns/page.tsx` | Replace orgAdminFilters with useCompanyFilters, add context indicator |
| `src/app/(protected)/inbox/page.tsx` | Replace inline role filter logic with useCompanyFilters, add context indicator |
| `src/app/(protected)/leads/page.tsx` | Replace orgAdminFilters with useCompanyFilters, add context indicator |
| `src/features/direct-mail/components/analytics-tab.tsx` | Replace inline isOrgAdmin filter with useCompanyFilters |
| `src/features/direct-mail/components/dashboard-section.tsx` | Replace inline isOrgAdmin filter with useCompanyFilters |

## Files NOT to Modify

Do not touch:
- `src/lib/api-client.ts`, `src/lib/api-types.ts`, `src/lib/api.ts`, `src/lib/permissions.ts`, `src/lib/auth-context.tsx`
- `src/components/ui/` (no new UI components needed)
- `src/components/shared/`
- `src/components/gate.tsx`, `src/components/route-guard.tsx`
- Any feature API files (`src/features/*/api.ts`)
- Settings, campaign detail, or any tab components
- `src/app/(protected)/layout.tsx`

---

## Design Specifications

- **Sidebar switcher area**: Between header and nav. `px-3 py-3 border-b border-zinc-800`. Label: `text-[11px] uppercase tracking-wider text-zinc-500 mb-1` with text "Client". Select full-width, `text-sm`.
- **"All Companies" option**: First option in dropdown, value `""`. Styled slightly differently — muted text if possible (native select limits this, so just use the text "All Companies").
- **Page context indicator**: `text-sm text-zinc-500 mt-0.5`. Format: "Viewing: {Company Name}" or "Viewing: All Companies". Only shown for `org_admin`.
- **No layout shift**: The sidebar width stays `w-60`. The dropdown fits within.
- **Transition**: When switching companies, all queries with `company_id` in their key automatically re-fetch via TanStack Query (the filter objects change → query keys change → re-fetch). No manual invalidation needed.

---

## Important: Query Key Design

The company filter is part of the query options passed to hooks. Since hooks like `useCampaigns(filters)` include the filters in the query key (e.g., `["campaigns", "list", filters]`), changing the selected company changes the query key, which triggers a re-fetch automatically. **No manual cache invalidation is needed when switching companies.** This is the TanStack Query cache behavior we want.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Sidebar shows company switcher dropdown for `org_admin` between header and nav
3. Dropdown is hidden for `company_admin` and `company_member`
4. Selecting a company scopes Dashboard, Campaigns, Inbox, Leads, Direct Mail data to that company
5. Selecting "All Companies" shows the global view (current behavior)
6. Selection persists to localStorage and survives page refresh
7. Invalid stored company ID (deleted company) gracefully resets to "All Companies"
8. Client Analytics and System Health sections only show in global "All Companies" view
9. Page headers show "Viewing: {Company Name}" context indicator for org_admin
10. Switching companies triggers automatic data re-fetch (query key change)
11. No manual query invalidation needed on company switch
12. Inbox `company_member` behavior unchanged (still `mine_only: true`)
13. `company_admin` behavior unchanged (JWT scopes automatically)
14. No regressions to any existing functionality
15. All scattered `isOrgAdmin` / `orgAdminFilters` patterns replaced with `useCompanyFilters()`

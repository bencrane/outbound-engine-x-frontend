# Directive #15: Cleanup — Shared Dialog, Cross-Feature Components, Campaign Create

## Context

This is a Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 app. The codebase is at `src/` with UI primitives in `src/components/ui/` (shadcn/ui pattern using `cn()` from `src/lib/utils.ts`), feature modules in `src/features/`, and pages in `src/app/(protected)/`.

Three issues need fixing:

1. **No shared Dialog component** — two dialog/modal implementations exist inline (`src/features/direct-mail/components/create-piece-dialog.tsx` and `src/features/campaigns/components/csv-import-dialog.tsx` both render their own `fixed inset-0 z-50` overlay). There's no `src/components/ui/dialog.tsx`.
2. **Cross-feature component imports** — several components live in one feature folder but are imported by other feature folders, creating implicit coupling. These need to move to a shared location.
3. **Campaign create flow is missing** — the "Create Campaign" button on `/campaigns` (in `src/app/(protected)/campaigns/page.tsx`) is disabled with no dialog. The mutation hooks (`useCreateCampaign` and `useCreateLinkedinCampaign`) already exist in `src/features/campaigns/api.ts` — just the UI is missing.

This is a refactoring + gap-fill directive. No new API hooks needed. Read every file listed below before modifying it.

---

## Task 1: Create Shared Dialog Component

Create `src/components/ui/dialog.tsx` following the shadcn/ui pattern:

```typescript
// Components to export:
Dialog        — wrapper managing open/close state via props { open, onOpenChange }
DialogContent — centered overlay panel with backdrop
DialogHeader  — title area
DialogTitle   — heading
DialogDescription — subtitle text
DialogFooter  — action buttons area
```

**Implementation:**
- `Dialog` takes `open: boolean` and `onOpenChange: (open: boolean) => void` props
- `DialogContent` renders when `open` is true: fixed overlay with `bg-black/50` backdrop, centered content with `max-w-lg` default (overridable via className)
- Close on backdrop click and Escape key (`useEffect` with keydown listener)
- Dark styled: `bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl`
- Uses `cn()`, `data-slot` attributes, `ComponentProps` typing — same patterns as all other UI components

**Then refactor the two existing dialogs:**

1. **`src/features/direct-mail/components/create-piece-dialog.tsx`** — replace the inline modal markup with `<Dialog>` + `<DialogContent>`. Keep all form logic unchanged. The component should receive `open` and `onClose` props and wrap its content in `<DialogContent className="max-w-2xl">`.

2. **`src/features/campaigns/components/csv-import-dialog.tsx`** — same refactor. Replace inline `fixed inset-0` div with `<Dialog>` + `<DialogContent className="max-w-4xl">`.

---

## Task 2: Move Cross-Feature Components to Shared Locations

### Status Badges → `src/components/shared/`

Create `src/components/shared/` directory.

**Move `CampaignStatusBadge`:**
- From: `src/features/campaigns/components/campaign-status-badge.tsx`
- To: `src/components/shared/campaign-status-badge.tsx`
- Update all imports (currently imported by: dashboard page, campaigns list, campaigns detail, system health section)

**Move `LeadStatusBadge`:**
- From: `src/features/campaigns/components/lead-status-badge.tsx`
- To: `src/components/shared/lead-status-badge.tsx`
- Update all imports (currently imported by: campaign leads tab, linkedin leads tab, leads table, lead detail panel)

**Move `InboxThreadMessage`:**
- From: `src/features/inbox/components/inbox-thread-message.tsx`
- To: `src/components/shared/inbox-thread-message.tsx`
- Update all imports (currently imported by: inbox thread view, lead detail panel)

**Move `DateRangeFilter`:**
- From: `src/features/analytics/components/date-range-filter.tsx`
- To: `src/components/shared/date-range-filter.tsx`
- Update all imports (currently imported by: dashboard page, direct mail analytics tab)

### Shared Hook: `useCompanies`

`useCompanies()` is defined in `src/features/settings/api.ts` but imported by:
- `src/features/direct-mail/components/create-piece-dialog.tsx`
- `src/features/analytics/components/client-analytics-section.tsx`
- Multiple settings tab components (these are fine — same feature)

Create `src/lib/hooks.ts` (shared hooks file):
- Move `useCompanies()` hook definition there
- In `src/features/settings/api.ts`, re-export it: `export { useCompanies } from "@/lib/hooks"`
- This way existing settings imports don't break, but the canonical location is now shared

---

## Task 3: Build Campaign Create Dialog

The "Create Campaign" button on `/campaigns` is still disabled with no dialog. Build it.

Create `src/features/campaigns/components/create-campaign-dialog.tsx`:

Uses the new shared `Dialog` component.

**Form (same spec from Directive #9):**

1. **Channel selection** — two large selectable cards:
   - "Email Campaign" with `Mail` icon
   - "LinkedIn Campaign" with `Linkedin` icon (import from lucide-react)
   - Selected card: `border-blue-500 bg-blue-500/5`. Unselected: `border-zinc-700 hover:border-zinc-600`.

2. **Campaign name** (required) — `Input`

3. **Company** (optional) — `Select` populated from `useCompanies()`. For `org_admin`, shown. For `company_admin`, auto-select their company (hidden field).

4. **LinkedIn-only fields** (shown when LinkedIn selected):
   - Description (optional) — `Textarea`
   - Daily Limit (optional) — `Input type="number"`
   - Delay Between Actions (optional) — `Input type="number"`

5. **Submit**: Calls `useCreateCampaign()` or `useCreateLinkedinCampaign()` (both already exist in `src/features/campaigns/api.ts`). On success: close dialog, navigate to `/campaigns/{newCampaign.id}?channel={email|linkedin}`.

6. **Error/loading states**: Disable button while pending, show error inline.

**Wire it up** in `src/app/(protected)/campaigns/page.tsx`:
- Replace the disabled `<Button>` with a button that opens the dialog
- Add `CreateCampaignDialog` component with `open` / `onClose` state
- Gate behind `campaigns.create` permission (already gated via `<Gate>`)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/dialog.tsx` | Shared Dialog component |
| `src/components/shared/campaign-status-badge.tsx` | Moved from campaigns feature |
| `src/components/shared/lead-status-badge.tsx` | Moved from campaigns feature |
| `src/components/shared/inbox-thread-message.tsx` | Moved from inbox feature |
| `src/components/shared/date-range-filter.tsx` | Moved from analytics feature |
| `src/lib/hooks.ts` | Shared hooks (useCompanies) |
| `src/features/campaigns/components/create-campaign-dialog.tsx` | Campaign create flow |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/direct-mail/components/create-piece-dialog.tsx` | Refactor to use shared Dialog |
| `src/features/campaigns/components/csv-import-dialog.tsx` | Refactor to use shared Dialog |
| `src/features/settings/api.ts` | Re-export useCompanies from `@/lib/hooks` |
| `src/app/(protected)/campaigns/page.tsx` | Wire up CreateCampaignDialog to the button |
| Plus all files that import the moved components — update import paths |

**Import updates needed** (change `@/features/.../` to `@/components/shared/`):

For `CampaignStatusBadge`:
- `src/app/(protected)/dashboard/page.tsx`
- `src/app/(protected)/campaigns/page.tsx`
- `src/app/(protected)/campaigns/[id]/page.tsx`
- `src/features/analytics/components/system-health-section.tsx`

For `LeadStatusBadge`:
- `src/features/campaigns/components/campaign-leads-tab.tsx`
- `src/features/campaigns/components/linkedin-leads-tab.tsx`
- `src/features/leads/components/leads-table.tsx`
- `src/features/leads/components/lead-detail-panel.tsx`

For `InboxThreadMessage`:
- `src/features/inbox/components/inbox-thread-view.tsx`
- `src/features/leads/components/lead-detail-panel.tsx`

For `DateRangeFilter`:
- `src/app/(protected)/dashboard/page.tsx`
- `src/features/direct-mail/components/analytics-tab.tsx`

For `useCompanies`:
- `src/features/direct-mail/components/create-piece-dialog.tsx`
- `src/features/analytics/components/client-analytics-section.tsx`
- (settings imports stay working via re-export)

## Files to Delete

After moving, delete the original files:
- `src/features/campaigns/components/campaign-status-badge.tsx`
- `src/features/campaigns/components/lead-status-badge.tsx`
- `src/features/inbox/components/inbox-thread-message.tsx`
- `src/features/analytics/components/date-range-filter.tsx`

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. `src/components/ui/dialog.tsx` exists with Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter exports
3. Both existing dialogs refactored to use the shared Dialog (no inline overlay markup)
4. `CampaignStatusBadge`, `LeadStatusBadge`, `InboxThreadMessage`, `DateRangeFilter` live in `src/components/shared/`
5. Old file locations are deleted
6. All import paths updated — no broken imports
7. `useCompanies` lives in `src/lib/hooks.ts` with re-export from settings api
8. "Create Campaign" button on `/campaigns` opens a working dialog
9. Email campaign creation calls the API and navigates to the new campaign
10. LinkedIn campaign creation shows extra fields and calls the LinkedIn API
11. No regressions — all existing pages render and function correctly
12. No cross-feature imports remain (features only import from `@/components/`, `@/lib/`, or their own feature folder)

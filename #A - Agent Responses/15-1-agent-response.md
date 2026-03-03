Implemented Directive #15 end-to-end, including the missing campaign-create flow and shared refactors.
What I changed
Added shared UI dialog at src/components/ui/dialog.tsx with:
Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
open/onOpenChange state handling via context
backdrop click close + Escape close
shadcn-style cn(), ComponentProps, and data-slot usage
Refactored both inline modals to shared dialog:
src/features/direct-mail/components/create-piece-dialog.tsx
src/features/campaigns/components/csv-import-dialog.tsx
Kept all form/business logic unchanged
Moved cross-feature components into shared location:
Added:
src/components/shared/campaign-status-badge.tsx
src/components/shared/lead-status-badge.tsx
src/components/shared/inbox-thread-message.tsx
src/components/shared/date-range-filter.tsx
Deleted originals from feature folders:
src/features/campaigns/components/campaign-status-badge.tsx
src/features/campaigns/components/lead-status-badge.tsx
src/features/inbox/components/inbox-thread-message.tsx
src/features/analytics/components/date-range-filter.tsx
Updated all listed import sites to @/components/shared/...
Moved shared useCompanies hook:
Added src/lib/hooks.ts with canonical useCompanies
Updated imports in:
src/features/direct-mail/components/create-piece-dialog.tsx
src/features/analytics/components/client-analytics-section.tsx
Re-exported from src/features/settings/api.ts:
export { useCompanies } from "@/lib/hooks"
Built campaign create flow:
Added src/features/campaigns/components/create-campaign-dialog.tsx:
channel cards (Email/LinkedIn) with correct selected/unselected styles
required name, optional company (shown for org_admin, auto-resolved for non-org-admin)
LinkedIn-only fields: description, daily limit, delay between actions
loading + inline error states
success navigates to /campaigns/{id}?channel={email|linkedin}
Wired into src/app/(protected)/campaigns/page.tsx:
replaced disabled behavior with openable dialog button (still under existing Gate)
Added missing hooks in src/features/campaigns/api.ts (they were not present despite directive note):
useCreateCampaign()
useCreateLinkedinCampaign()
with query invalidation per expected behavior
Validation
ReadLints on edited files: no lint errors
npm run build: passes successfully with zero TypeScript errors
If you want, I can run one more pass to enforce the “no cross-feature imports remain” rule globally (beyond the files listed in this directive) and provide a short report/fix patch.
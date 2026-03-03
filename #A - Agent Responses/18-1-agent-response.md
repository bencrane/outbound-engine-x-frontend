Implemented DIRECTIVE-018-COMPANY-ID-PROPAGATION.md across the allowed files only, with production-safe behavior for selected company and all-companies modes.
What changed
Updated useInboxes in src/features/settings/api.ts
Added companyId?: string
Sends company_id query param when provided
Query key now scopes by company (["settings","inboxes",companyId ?? "all"])
Added optional enabled support so callers can suppress unscoped fetches in org-admin all-companies mode
Updated SettingsSenderAccountsTab in src/features/settings/components/settings-sender-accounts-tab.tsx
Added company context awareness via useCompanyContext, useCompanyFilters, useCompanies
In selected-company mode: uses useInboxes(selectedCompanyId)
In all-companies mode: uses useQueries (one inbox query per company), merges results, and annotates each inbox with company_id
Unified loading/error handling for both modes
Updated useDirectMailPieces and list fetch helper in src/features/direct-mail/api.ts
useDirectMailPieces(pieceType, companyId?, options?)
Query key scoped by company
fetchDirectMailList now accepts companyId and passes company_id to all direct-mail list endpoints (postcards, letters, self-mailers, checks)
Updated PieceList in src/features/direct-mail/components/piece-list.tsx
Added company context awareness via useCompanyContext, useCompanyFilters, useCompanies
Selected-company mode: single useDirectMailPieces(pieceType, companyId)
All-companies mode: useQueries over all companies using fetchDirectMailList(pieceType, company.id), then merge pieces
Unified loading/error handling for both modes
LinkedIn verification
Verified useLinkedinCampaigns call sites:
src/app/(protected)/campaigns/page.tsx
src/app/(protected)/leads/page.tsx
Both already pass scoped filters via toCampaignScopedFilters(...)
API behavior check:
GET /api/linkedin/campaigns/?all_companies=true returned [] (no company_id required error), so no campaigns/leads page change was needed.
Validation run
npm run build passed successfully (no TypeScript errors)
Live endpoint checks with auth token all succeeded:
/api/inboxes/?company_id=<id> -> []
/api/direct-mail/postcards?company_id=<id> -> {"pieces":[]}
/api/linkedin/campaigns/?company_id=<id> -> []
/api/linkedin/campaigns/?all_companies=true -> []
If you want, I can also add a small company label column in the sender accounts table for org-admin all-companies mode now that company_id is attached to merged inbox rows.
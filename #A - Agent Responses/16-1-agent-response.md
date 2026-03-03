Implemented Directive #16 with centralized company context, sidebar switcher, and page-level scoping updates.
What I changed
Created src/lib/company-context.tsx
Added CompanyProvider, useCompanyContext(), useCompanyFilters()
Context state:
selectedCompanyId: string | null
selectedCompany
companies
isLoading
Persistence:
Restores from localStorage key selectedCompanyId
Persists selection changes
Resets to null if stored ID is no longer in company list
Role behavior:
org_admin: context active
non-org_admin: always effectively “All Companies” (context neutralized)
Updated src/components/providers.tsx
Provider tree is now:
QueryClientProvider → AuthProvider → CompanyProvider → children
Updated src/components/sidebar.tsx
Added org-admin-only company switcher between app header and nav
Uses existing Select + Skeleton
Includes label (Client) with requested styling
Options:
All Companies (value="")
each company from context
Change handler maps empty string to null
Pages/components refactored to use useCompanyFilters()
src/app/(protected)/dashboard/page.tsx
Replaced inline org-admin scoping with useCompanyFilters()
Added context indicator under subtitle:
Viewing: {Company Name} / Viewing: All Companies (org-admin only)
Added global-view logic:
isGlobalView = org_admin && selectedCompanyId === null
Client Analytics + System Health now render only in global view
Campaign/recent message filters now derive from centralized company filters
src/app/(protected)/campaigns/page.tsx
Replaced orgAdminFilters with useCompanyFilters()
Applies centralized filters to useCampaigns() and useLinkedinCampaigns()
Added org-admin context indicator
src/app/(protected)/inbox/page.tsx
Replaced role-branch scoping with useCompanyFilters() in shared logic
Kept company_member special case (mine_only: true) unchanged
Added org-admin context indicator
Added org-admin selected-company message filtering in-page to keep visible inbox data aligned with selected client context
src/app/(protected)/leads/page.tsx
Replaced orgAdminFilters with useCompanyFilters()
Applies centralized filters to campaign queries powering leads view
Added org-admin context indicator
src/features/direct-mail/components/analytics-tab.tsx
Replaced inline role/company filter construction with useCompanyFilters()
src/features/direct-mail/components/dashboard-section.tsx
Replaced inline role/company filter construction with useCompanyFilters()
Validation
ReadLints: clean on all touched files
npm run build: passes with zero TypeScript errors
If you want, I can run a quick interactive smoke checklist next (org_admin switching All ↔ specific client across Dashboard/Campaigns/Inbox/Leads/Direct Mail) and report exact observed behavior per page.
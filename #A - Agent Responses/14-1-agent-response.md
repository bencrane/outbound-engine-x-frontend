Implemented Directive #14 completely with production-ready code and verified with a full build.
What I changed
Added useDirectMailAnalytics(filters?) to src/features/direct-mail/api.ts
Query key: ["direct-mail", "analytics", filters ?? {}]
Calls GET /api/analytics/direct-mail with query params
Added exported DirectMailAnalyticsFilters and DirectMailAnalyticsResponse types
Added new analytics components:
src/features/direct-mail/components/analytics-tab.tsx
src/features/direct-mail/components/volume-pivot-table.tsx
src/features/direct-mail/components/delivery-funnel.tsx
src/features/direct-mail/components/daily-trends-table.tsx
src/features/direct-mail/components/dashboard-section.tsx
Direct Mail page updates
Updated src/app/(protected)/direct-mail/page.tsx
Added new Analytics tab as first tab
Made Analytics the default tab (defaultValue="analytics")
Final order now: Analytics | Postcards | Letters | Self-Mailers | Checks | Verify Address
Wired in DirectMailAnalyticsTab
Analytics tab behavior delivered
Reused existing DateRangeFilter
Passes from_ts / to_ts to analytics hook
Summary cards:
Total Pieces + per-type counts (postcards, letters, self-mailers, checks)
Volume matrix:
Pivoted from flat volume_by_type_status
Zero-filled missing combinations
Status headers color-coded to align with PieceStatusBadge semantics
Zero values rendered as muted -
Delivery funnel:
Horizontal bars (h-6, bg-blue-600, rounded-sm)
Width proportional to first stage/max baseline
Failure reasons:
Sorted descending by count
Reason text in red
Empty state: “No failures in this period”
Daily trends:
Sorted descending by date
Date formatted as Jan 15 or Jan 15, 2026
Shows last 30 rows with “Show all / Show last 30” toggle
Numeric columns right-aligned, alternating row shading
Added section-level loading/error/empty states across all analytics sections
Dashboard integration delivered
Updated src/app/(protected)/dashboard/page.tsx
Added Direct Mail section below existing analytics blocks
Gated by isOrgAdmin + <Gate permission="direct-mail.view">
Uses shared dashboard date range (fromTs / toTs)
Includes 4 metrics:
Total Pieces
Delivered
In Transit
Failed / Returned
Added “View Direct Mail →” link to /direct-mail with ArrowRight
Role/data scoping
In both analytics tab and dashboard section:
org_admin sends all_companies: true
non-org-admin with company sends company_id
Keeps API scoping explicit and aligned with role behavior requirements
Verification
Ran npm run build successfully (TypeScript + app build passed)
No linter errors in touched files (ReadLints clean)
Only non-blocking build note observed: Next.js root warning about multiple lockfiles outside this repo path. It does not affect correctness of this directive implementation.
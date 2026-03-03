Implemented Directive #13 completely, scoped to only the allowed files.
Files modified
src/lib/permissions.ts
Added permissions:
direct-mail.view
direct-mail.manage
Role grants:
org_admin: both
company_admin: direct-mail.view only
company_member: none
src/components/sidebar.tsx
Added nav item between Leads and Settings:
Direct Mail → /direct-mail
Mail icon
permission: direct-mail.view
Files created
src/features/direct-mail/api.ts
Added full direct mail hook surface:
useDirectMailPieces(pieceType)
useDirectMailPiece(pieceType, pieceId)
useCreateDirectMailPiece()
useCancelDirectMailPiece()
useVerifyAddress()
useBulkVerifyAddresses()
Implemented typed per-endpoint dispatch internally for all 4 piece types.
src/features/direct-mail/components/piece-status-badge.tsx
Status → badge variant mapping for full lifecycle.
src/features/direct-mail/components/piece-list.tsx
Piece table with:
status filter buttons
loading/empty/error states
details expansion
cancel action (only for queued/processing)
cancel gated by direct-mail.manage
src/features/direct-mail/components/piece-detail-panel.tsx
Expanded piece detail view:
full ID, type/status, provider, send/created/updated
metadata key-value rendering
collapsible raw JSON block
src/features/direct-mail/components/create-piece-dialog.tsx
Create flow (permission-aware):
piece type select
company select for org_admin
structured To/From address + content fields
advanced section (idempotency key + raw JSON override)
raw JSON takes precedence when provided
submit via useCreateDirectMailPiece()
src/features/direct-mail/components/address-verification.tsx
Single US address verification form + result card
Bulk verification textarea parser (one per line, comma-separated)
Bulk results table with status badges + normalized address display
src/app/(protected)/direct-mail/page.tsx
New protected route with RouteGuard(permission="direct-mail.view")
5 tabs:
Postcards
Letters
Self-Mailers
Checks
Verify
+ Create Piece button shown only with direct-mail.manage
Validation
npm run lint ✅
npm run build ✅ (0 TypeScript errors)
New route present in build output: /direct-mail ✅
Note
There is no existing shared Dialog UI component in the codebase, so create-piece-dialog.tsx uses a self-contained modal implementation while preserving the intended behavior and layout.
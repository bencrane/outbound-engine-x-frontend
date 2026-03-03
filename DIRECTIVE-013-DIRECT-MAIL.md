# Directive #13: Direct Mail — Feature Module + Piece Management

## Context

This is a new channel being added to the platform alongside Email (EmailBison) and LinkedIn (HeyReach). Direct mail is powered by Lob and supports 4 piece types: postcards, letters, self-mailers, and checks. All 4 share identical schemas — the only difference is the API path.

This directive creates the entire direct mail feature from scratch: new feature module, new sidebar nav item, new permissions, new page with piece management, and address verification.

### API Surface (18 endpoints)

**4 piece types × 4 operations = 16 endpoints:**
| Operation | Postcards | Letters | Self-Mailers | Checks |
|-----------|-----------|---------|--------------|--------|
| Create | `POST /api/direct-mail/postcards` | `.../letters` | `.../self-mailers` | `.../checks` |
| List | `GET /api/direct-mail/postcards` | `.../letters` | `.../self-mailers` | `.../checks` |
| Get | `GET .../postcards/{piece_id}` | `.../letters/{piece_id}` | `.../self-mailers/{piece_id}` | `.../checks/{piece_id}` |
| Cancel | `POST .../postcards/{piece_id}/cancel` | `.../letters/{piece_id}/cancel` | `.../self-mailers/{piece_id}/cancel` | `.../checks/{piece_id}/cancel` |

**Address verification (2 endpoints):**
- `POST /api/direct-mail/verify-address/us` — single address
- `POST /api/direct-mail/verify-address/us/bulk` — bulk addresses

### Key Schemas

**DirectMailPieceCreateRequest** (same for all types):
```typescript
{ payload: Record<string, unknown>, company_id?: string, idempotency_key?: string, idempotency_location?: "header" | "query" }
```
The `payload` is provider-specific (Lob format). Typical fields: `to` (address object), `from` (return address), `front` (template/HTML), `back`, `size`, etc.

**DirectMailPieceResponse** (same for all types):
```typescript
{
  id: string
  type: "postcard" | "letter" | "self_mailer" | "check"
  status: "queued" | "processing" | "ready_for_mail" | "in_transit" | "delivered" | "returned" | "canceled" | "failed" | "unknown"
  created_at: string
  updated_at: string
  send_date: string | null
  metadata: Record<string, unknown> | null
  provider: string | null
}
```

**DirectMailPieceListResponse**: `{ pieces: DirectMailPieceResponse[] }`

**DirectMailPieceCancelResponse**: `{ id, type, status, updated_at }`

**DirectMailAddressVerificationResponse**:
```typescript
{
  status: "deliverable" | "undeliverable" | "corrected" | "partial" | "unknown"
  deliverability: "deliverable" | "undeliverable" | "corrected" | "partial" | "unknown"
  normalized_address: Record<string, unknown> | null
  raw_provider_status: string | null
}
```

---

## Step 1: RBAC Updates

### Add Permissions

Add to `src/lib/permissions.ts`:

New permissions:
- `"direct-mail.view"` — view direct mail pieces and page
- `"direct-mail.manage"` — create pieces, cancel pieces, verify addresses

Grant to roles:
- `org_admin`: both `direct-mail.view` and `direct-mail.manage`
- `company_admin`: `direct-mail.view` only (read-only access)
- `company_member`: neither (no access)

### Add Sidebar Nav Item

Add to `src/components/sidebar.tsx`:

New nav item between Leads and Settings:
```typescript
{ name: "Direct Mail", href: "/direct-mail", icon: Mail, permission: "direct-mail.view" }
```
Import `Mail` from `lucide-react`.

---

## Step 2: Feature Module

Create `src/features/direct-mail/`:
```
src/features/direct-mail/
├── api.ts
└── components/
    ├── piece-list.tsx
    ├── piece-detail-panel.tsx
    ├── create-piece-dialog.tsx
    ├── piece-status-badge.tsx
    └── address-verification.tsx
```

---

## Step 3: API Hooks

Create `src/features/direct-mail/api.ts` with all hooks.

Since all 4 piece types share the same schemas, create **generic hooks** parameterized by piece type:

```typescript
type PieceType = "postcards" | "letters" | "self-mailers" | "checks";
```

#### `useDirectMailPieces(pieceType)`
Calls `GET /api/direct-mail/{pieceType}`. Returns `DirectMailPieceListResponse`.
Query key: `["direct-mail", pieceType, "list"]`

Implementation note: Since `openapi-fetch` needs literal path strings, create separate internal functions for each type and dispatch based on the `pieceType` param.

#### `useDirectMailPiece(pieceType, pieceId)`
Calls `GET /api/direct-mail/{pieceType}/{piece_id}`. Returns `DirectMailPieceResponse`.
Query key: `["direct-mail", pieceType, pieceId]`
Enabled when `pieceId` is truthy.

#### `useCreateDirectMailPiece()`
Mutation. Takes `{ pieceType, payload, company_id?, idempotency_key? }`.
Calls `POST /api/direct-mail/{pieceType}`.
Invalidates `["direct-mail", pieceType, "list"]` on success.

#### `useCancelDirectMailPiece()`
Mutation. Takes `{ pieceType, pieceId }`.
Calls `POST /api/direct-mail/{pieceType}/{piece_id}/cancel`.
Invalidates `["direct-mail", pieceType, "list"]` and `["direct-mail", pieceType, pieceId]` on success.

#### `useVerifyAddress()`
Mutation. Calls `POST /api/direct-mail/verify-address/us`.
Body: `{ payload: Record<string, unknown> }` — provider-specific address object (typically `{ primary_line, city, state, zip_code }`).
Returns `DirectMailAddressVerificationResponse`.

#### `useBulkVerifyAddresses()`
Mutation. Calls `POST /api/direct-mail/verify-address/us/bulk`.
Body: `{ payload: Record<string, unknown> }` — array of addresses.
Returns `DirectMailAddressVerificationResponse[]`.

---

## Step 4: Page + Route

### Create `/direct-mail` page

Create `src/app/(protected)/direct-mail/page.tsx`.

Wrap with `<RouteGuard permission="direct-mail.view">`.

### Page Layout

```
┌──────────────────────────────────────────────────────────┐
│ Direct Mail                       [+ Create Piece]       │
│ Manage postcards, letters, self-mailers, and checks      │
│                                                          │
│ [Postcards] [Letters] [Self-Mailers] [Checks] [Verify]  │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ (tab content — piece list or address verification)   │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Use the `Tabs` component with 5 tabs:
- 4 piece type tabs (Postcards, Letters, Self-Mailers, Checks) — each showing the same `PieceList` component with different `pieceType` prop
- 1 Address Verification tab

---

## Step 5: Components

### `PieceStatusBadge` (`piece-status-badge.tsx`)

Maps piece status to badge variants:

| Status | Variant | Notes |
|--------|---------|-------|
| queued | outline | Waiting |
| processing | secondary | In progress |
| ready_for_mail | warning | Ready to send |
| in_transit | default (blue) | On the way |
| delivered | success | Done |
| returned | warning | Came back |
| canceled | secondary | User canceled |
| failed | destructive | Error |
| unknown | outline | — |

### `PieceList` (`piece-list.tsx`)

Receives `pieceType: PieceType` prop. Fetches and displays pieces.

**Table columns:**
| Column | Field | Notes |
|--------|-------|-------|
| ID | `id` | Truncated, monospace, clickable to expand detail |
| Type | `type` | Badge (only relevant on "All" view — within a tab it's redundant but good to have) |
| Status | `status` | `PieceStatusBadge` |
| Send Date | `send_date` | Formatted date or "-" |
| Created | `created_at` | Formatted date |
| Actions | — | DropdownMenu: View Details, Cancel (if cancellable) |

**Cancel action**: Only show for pieces with status `queued` or `processing` (pieces already in transit or delivered can't be canceled). Calls `useCancelDirectMailPiece()` with confirmation.

**Status filter**: Button group above the table: All, Queued, Processing, In Transit, Delivered, Returned, Failed. Client-side filter.

**Loading/empty/error states** as with all other tables.

### `PieceDetailPanel` (`piece-detail-panel.tsx`)

Expandable row (same pattern as leads/inbox detail panels). Shows:
- Full piece ID
- Type + Status badges
- Provider
- Send date
- Created / Updated timestamps
- Metadata — render key-value pairs from the `metadata` object
- Raw data collapsible `<pre>` block

### `CreatePieceDialog` (`create-piece-dialog.tsx`)

Uses the `Dialog` component. Gated behind `direct-mail.manage`.

**Form:**
1. **Piece Type** select: Postcard, Letter, Self-Mailer, Check
2. **Company** select (for `org_admin`): populated from `useCompanies()`
3. **Payload** — since this is provider-specific (Lob format), provide a structured form for the most common fields:

   **To Address:**
   - Name (Input)
   - Address Line 1 (Input, required)
   - Address Line 2 (Input)
   - City (Input, required)
   - State (Input, required)
   - Zip Code (Input, required)

   **From Address** (same fields)

   **Content:**
   - Front (Textarea — HTML or template URL)
   - Back (Textarea — for postcards)
   - Size select: `4x6`, `6x9`, `6x11` (for postcards)

   **Advanced:** Collapsible section with:
   - Idempotency Key (Input, optional)
   - Raw JSON payload (Textarea — for power users who want to send the raw Lob payload directly)

4. **Submit**: If raw JSON is provided, use it as the payload directly. Otherwise, construct the payload from the form fields:
   ```json
   {
     "to": { "name": "...", "address_line1": "...", "city": "...", "state": "...", "zip_code": "..." },
     "from": { ... },
     "front": "...",
     "back": "...",
     "size": "4x6"
   }
   ```

On success, close dialog, show success message, table refreshes.

### `AddressVerification` (`address-verification.tsx`)

A standalone tab for verifying US addresses before sending mail.

**Single Verification:**
```
┌──────────────────────────────────────────────────────────┐
│ Verify Address                                           │
│                                                          │
│ Address Line 1: [_________________________________]      │
│ Address Line 2: [_________________________________]      │
│ City:           [____________]                           │
│ State:          [____]                                   │
│ Zip Code:       [__________]                             │
│                                        [Verify Address]  │
│                                                          │
│ Result:                                                  │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Status: ✓ Deliverable                              │   │
│ │ Normalized: 123 MAIN ST, APT 4, NEW YORK NY 10001 │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

- Form with address fields
- Submit calls `useVerifyAddress()` with payload: `{ primary_line, secondary_line, city, state, zip_code }`
- Result shows:
  - Status badge: deliverable (success), undeliverable (destructive), corrected (warning), partial (warning), unknown (outline)
  - Normalized address if available
  - Raw provider status

**Bulk Verification:**
- Textarea for pasting multiple addresses (one per line, comma-separated fields: `address_line1, city, state, zip_code`)
- Submit calls `useBulkVerifyAddresses()`
- Results displayed as a table with status per address

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/direct-mail/api.ts` | All direct mail hooks |
| `src/features/direct-mail/components/piece-list.tsx` | Piece table with status filter |
| `src/features/direct-mail/components/piece-detail-panel.tsx` | Expandable piece detail |
| `src/features/direct-mail/components/create-piece-dialog.tsx` | Create piece form |
| `src/features/direct-mail/components/piece-status-badge.tsx` | Status → badge mapping |
| `src/features/direct-mail/components/address-verification.tsx` | Address verify UI |
| `src/app/(protected)/direct-mail/page.tsx` | Direct mail page |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/permissions.ts` | Add `direct-mail.view` and `direct-mail.manage` permissions |
| `src/components/sidebar.tsx` | Add "Direct Mail" nav item with `Mail` icon |

## Files NOT to Modify

Do not touch any other file. The direct mail feature is entirely self-contained.

---

## Design Specifications

- **Page layout**: `p-8`, same as all other pages.
- **Tabs**: Same tab component, 5 tabs. Piece type tabs use singular labels in the tab but plural in the table context.
- **Piece status badges**: Use colorful variants to make the delivery lifecycle visually scannable.
- **Create dialog**: `max-w-2xl` (wider than campaign create dialog due to address forms). Two-column layout for To/From addresses on larger screens.
- **Address fields**: Standard US address layout. State as a short `Input` (2 chars), zip as `Input`.
- **Verification results**: Deliverable = green card. Undeliverable = red card. Corrected = yellow card showing both original and corrected.
- **Raw JSON textarea** in create dialog: `font-mono text-sm` with `rows={10}`. Placeholder shows example Lob payload.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. "Direct Mail" appears in sidebar for `org_admin` and `company_admin`
3. `direct-mail.view` and `direct-mail.manage` permissions work correctly
4. `/direct-mail` page shows tabs for all 4 piece types + verification
5. Each piece type tab lists pieces with status badges and filtering
6. Piece detail panel expands with full info + metadata
7. Create piece dialog works with structured form fields
8. Raw JSON payload option works for power users
9. Cancel piece works for queued/processing pieces with confirmation
10. Single address verification shows deliverability result
11. Bulk address verification parses textarea input and shows results table
12. All hooks use proper query key patterns and invalidation
13. Loading/empty/error states on all views
14. Create/cancel gated behind `direct-mail.manage`
15. `company_member` cannot access the page

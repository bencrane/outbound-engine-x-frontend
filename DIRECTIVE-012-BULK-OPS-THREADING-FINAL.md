# Directive #12: Bulk Operations + Reply Threading + Webhook Testing (Final)

## Context

This is the final directive. After this, every non-internal, non-super-admin endpoint in the API will be hooked and displayed in the frontend. The remaining gaps are bulk operations, reply threading in the inbox, webhook testing tools, and a few single-entity GET endpoints.

### Remaining Endpoints

**Bulk Operations (9 endpoints):**
- Bulk delete campaigns
- Bulk create leads from CSV
- Bulk update lead status
- Bulk delete leads
- Bulk create inboxes
- Bulk update inbox signatures
- Bulk update inbox daily limits
- Bulk create blocklisted emails
- Bulk create blocklisted domains

**Reply Threading (2 endpoints):**
- Get reply detail
- Get reply thread

**Webhook Testing (3 endpoints):**
- Get single webhook detail
- Get sample webhook payload
- Send test webhook event

**Single Entity GETs (2 endpoints — low priority):**
- `GET /api/organizations/{org_id}` — already using list endpoint
- `GET /api/users/{user_id}` — already using list endpoint

The single-entity GETs are already functionally covered by the list endpoints. We'll hook them for completeness but won't add new UI.

---

## Part 1: Bulk Operations

### New Hooks

#### Campaign Bulk Ops (add to `src/features/campaigns/api.ts`)

##### `useBulkDeleteCampaigns()`
```
DELETE /api/email-outreach/campaigns/bulk
Body: { campaign_ids: string[] }
```
Mutation. Invalidates `campaignQueryKeys.list()` and `["linkedin", "campaigns"]`.

##### `useBulkCreateLeadsCsv()`
```
POST /api/email-outreach/leads/bulk/csv
Body: { payload: Record<string, unknown> }
```
The payload format is provider-specific. This endpoint accepts a CSV-parsed object. Mutation. Invalidates campaign lead queries.

##### `useBulkUpdateLeadStatus()`
```
PATCH /api/email-outreach/leads/bulk/status
Body: { campaign_id: string, lead_ids: string[], status: string }
```
Mutation. Invalidates `campaignQueryKeys.leads(campaignId)`.

##### `useBulkDeleteLeads()`
```
DELETE /api/email-outreach/leads/bulk
Body: { campaign_id: string, lead_ids: string[] }
```
Mutation. Invalidates `campaignQueryKeys.leads(campaignId)`.

#### Inbox Bulk Ops (add to `src/features/settings/api.ts`)

##### `useBulkCreateInboxes()`
```
POST /api/email-outreach/inboxes/bulk/create
Body: { payload: Record<string, unknown> }
```
Provider-specific payload. Mutation. Invalidates `["settings", "inboxes"]`.

##### `useBulkUpdateInboxSignatures()`
```
PATCH /api/email-outreach/inboxes/bulk/signatures
Body: { inbox_ids: string[], email_signature: string }
```
Mutation. Invalidates `["settings", "inboxes"]`.

##### `useBulkUpdateInboxDailyLimits()`
```
PATCH /api/email-outreach/inboxes/bulk/daily-limits
Body: { inbox_ids: string[], daily_limit: number }
```
Mutation. Invalidates `["settings", "inboxes"]`.

#### Blocklist Bulk Ops (add to `src/features/settings/api.ts`)

##### `useBulkCreateBlocklistedEmails()`
```
POST /api/email-outreach/blocklist/emails/bulk
Body: { emails: string[] }
```
Mutation. Invalidates `["settings", "blocklist", "emails"]`.

##### `useBulkCreateBlocklistedDomains()`
```
POST /api/email-outreach/blocklist/domains/bulk
Body: { domains: string[] }
```
Mutation. Invalidates `["settings", "blocklist", "domains"]`.

### Bulk Operations UI

#### Campaign List: Bulk Delete

Enhance `/campaigns` list page with multi-select and bulk delete:

1. Add a **Checkbox** column to the campaigns table (first column)
2. "Select all" checkbox in the header
3. When 1+ campaigns selected, show a **bulk action bar** above the table:
   ```
   ┌─────────────────────────────────────────────────────┐
   │ 3 campaigns selected    [Delete Selected]           │
   └─────────────────────────────────────────────────────┘
   ```
4. "Delete Selected" calls `useBulkDeleteCampaigns()` with confirmation dialog
5. Gate behind `campaigns.manage` permission

#### Campaign Leads Tab: Bulk Actions

Enhance the email campaign leads tab (`CampaignLeadsTab`) with multi-select:

1. Add **Checkbox** column to leads table
2. When 1+ leads selected, show bulk action bar:
   ```
   ┌─────────────────────────────────────────────────────┐
   │ 5 leads selected  [Change Status ▾] [Delete Selected] │
   └─────────────────────────────────────────────────────┘
   ```
3. "Change Status" is a `Select` dropdown with lead statuses → calls `useBulkUpdateLeadStatus()`
4. "Delete Selected" calls `useBulkDeleteLeads()` with confirmation
5. Gate behind `campaigns.manage`

#### Campaign Leads Tab: CSV Import

Add a "Import CSV" button (next to the "Add Leads" button from Directive #9):

1. Button opens a file input (`<input type="file" accept=".csv">`)
2. On file select, parse the CSV client-side into rows
3. Show a preview of the first 5 rows with column mapping
4. Submit calls `useBulkCreateLeadsCsv()` with the parsed data
5. CSV parsing: use a simple split-by-comma approach (no external library). Expect headers: email, first_name, last_name, company, title, phone, linkedin_url

Create `src/features/campaigns/components/csv-import-dialog.tsx` for this flow. Use the Dialog component.

#### Sender Accounts: Bulk Signatures

The sender accounts tab (from Directive #10) already has bulk actions for warmup. Add bulk signature update:

1. When inboxes are selected, add a "Update Signatures" button to the bulk action bar
2. Clicking opens an inline `Textarea` for the signature + Submit button
3. Calls `useBulkUpdateInboxSignatures()`

#### Blocklist: Bulk Add

Enhance the blocklist tab with bulk add:

1. Add a "Bulk Add" button next to the single-add input for both emails and domains
2. Clicking opens a `Textarea` where users paste multiple entries (one per line)
3. Submit parses lines and calls `useBulkCreateBlocklistedEmails()` or `useBulkCreateBlocklistedDomains()`

---

## Part 2: Reply Threading

### New Hooks (add to `src/features/inbox/api.ts`)

##### `useReplyDetail(campaignId, replyId)`
```
GET /api/campaigns/{campaign_id}/replies/{reply_id}
Returns: untyped (response schema is empty in OpenAPI spec)
```
Query key: `["inbox", "reply-detail", campaignId, replyId]`
Enabled only when both IDs are truthy.

##### `useReplyThread(campaignId, replyId)`
```
GET /api/campaigns/{campaign_id}/replies/{reply_id}/thread
Returns: untyped (response schema is empty in OpenAPI spec)
```
Query key: `["inbox", "reply-thread", campaignId, replyId]`
Enabled only when both IDs are truthy.

### Reply Threading in Inbox

Currently the inbox thread view uses `useLeadThread(campaignId, leadId)` which fetches all messages for a lead. The reply-specific thread endpoint provides a more focused view tied to a specific reply conversation.

Enhancement to `InboxThreadView`:

When a selected message is an inbound reply (direction = "inbound"), add a "View Reply Thread" link/button that:
1. Calls `useReplyThread(campaignId, messageId)` — using the message ID as the reply ID
2. If the reply thread returns data, render it in place of the lead-level thread
3. If it fails (not all messages map to replies), fall back to the existing lead-level thread

The reply thread endpoint returns messages ordered as a conversation, which may be more accurate than the lead-level thread for multi-subject conversations.

This is a progressive enhancement — the existing lead thread view remains the default.

---

## Part 3: Webhook Testing

### New Hooks (add to `src/features/settings/api.ts`)

##### `useGetWebhook(webhookId)`
```
GET /api/email-outreach/webhooks/{webhook_id}
Returns: untyped
```
Query key: `["settings", "webhooks", webhookId]`

##### `useWebhookSamplePayload()`
```
POST /api/email-outreach/webhooks/sample-payload
Body: { event_type: string }
Returns: untyped (the sample payload JSON)
```
Mutation (conceptually a read, but POST).

##### `useSendTestWebhookEvent()`
```
POST /api/email-outreach/webhooks/test-event
Body: { event_type: string, url: string }
Returns: untyped
```
Mutation.

### Webhook Testing UI

Enhance `SettingsWebhooksTab`:

1. **View Details action**: Add "View Details" to the webhook row dropdown. Expands an inline panel showing the full webhook config from `useGetWebhook()`.

2. **Sample Payload viewer**: In the webhook detail panel or as a standalone section:
   - Select an event type from `useWebhookEventTypes()`
   - Click "View Sample Payload"
   - Calls `useWebhookSamplePayload()` and displays the result in a `<pre>` code block
   - Copy button for the JSON

3. **Send Test Event**: In the webhook detail panel:
   - Select an event type
   - Pre-fill URL from the webhook
   - Click "Send Test Event"
   - Calls `useSendTestWebhookEvent()`
   - Shows success/failure result inline

---

## Part 4: Single Entity GETs (Completeness)

Add hooks but no new UI (already covered by list endpoints):

Add to `src/features/settings/api.ts`:

##### `useOrganizationById(orgId)`
```
GET /api/organizations/{org_id}
```
Query key: `["settings", "organization", orgId]`

##### `useUserById(userId)`
```
GET /api/users/{user_id}
```
Query key: `["settings", "users", userId]`

These are available for future use (e.g., user profile page) but don't need UI now.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/campaigns/components/csv-import-dialog.tsx` | CSV lead import flow |
| `src/features/campaigns/components/campaign-bulk-actions.tsx` | Campaign list bulk action bar |
| `src/features/campaigns/components/lead-bulk-actions.tsx` | Lead table bulk action bar |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/campaigns/api.ts` | Add 4 bulk mutation hooks |
| `src/features/settings/api.ts` | Add 5 bulk mutations + 3 webhook hooks + 2 single-entity GETs |
| `src/features/inbox/api.ts` | Add reply detail + reply thread hooks |
| `src/app/(protected)/campaigns/page.tsx` | Add checkbox column + bulk delete bar |
| `src/features/campaigns/components/campaign-leads-tab.tsx` | Add checkbox column + bulk status/delete + CSV import button |
| `src/features/inbox/components/inbox-thread-view.tsx` | Add reply thread fallback |
| `src/features/settings/components/settings-sender-accounts-tab.tsx` | Add bulk signatures to action bar |
| `src/features/settings/components/settings-blocklist-tab.tsx` | Add bulk add textarea for emails + domains |
| `src/features/settings/components/settings-webhooks-tab.tsx` | Add view details panel + sample payload + test event |

## Files NOT to Modify

Do not touch:
- `src/lib/`
- `src/components/ui/`
- Dashboard, inbox page, leads page, settings page shell
- `src/features/analytics/`, `src/features/leads/`, `src/features/tags/`
- Any tab component not listed above

---

## Design Specifications

- **Bulk action bars**: `flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 mb-4`. Shows selected count + action buttons. Same pattern as sender accounts bulk bar.
- **Checkbox in tables**: Use the `Checkbox` component from D10. First column, narrow width.
- **CSV import dialog**: Use `Dialog` component. File input styled as a drop zone: `border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-500`. Preview table shows first 5 rows.
- **CSV parsing**: Split by newlines, split each line by commas, trim whitespace. First row is headers. Map to `LeadCreateInput` fields. Show error if email column is missing.
- **Bulk add textarea**: `Textarea rows={4}` with placeholder "One per line". Parse on submit by splitting on newlines and trimming.
- **Webhook detail panel**: Expandable row. JSON displayed in `<pre>` blocks. Test result shows green/red badge.
- **Sample payload**: `<pre className="max-h-96 overflow-auto rounded-md bg-zinc-800 p-4 text-xs font-mono text-zinc-300">` with copy button.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. Campaign list has checkbox selection + bulk delete
3. Campaign leads tab has checkbox selection + bulk status change + bulk delete
4. CSV import dialog parses file, shows preview, submits to API
5. Sender accounts bulk signatures works for selected inboxes
6. Blocklist tab has bulk add for emails and domains (textarea, one per line)
7. Reply thread hook available and used as progressive enhancement in inbox
8. Webhook detail panel shows full webhook config
9. Sample payload viewer fetches and displays JSON for selected event type
10. Send test event works with success/failure feedback
11. All bulk mutations invalidate correct query keys
12. All bulk actions gated by appropriate permissions
13. Single-entity GET hooks exist for organizations and users
14. Loading/error states on all new features
15. No regressions to any existing functionality
16. **Every non-internal, non-super-admin API endpoint is now hooked in the frontend**

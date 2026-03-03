Diagnostic Report
Environment
API Base URL: https://api.outboundengine.dev (from .env.local)
Auth Status: not fully testable with authenticated calls (no credentials/token available in repo); direct unauthenticated API calls return 401 with "Missing authorization header"; login endpoint is reachable and returns "Invalid email or password" for invalid credentials
Dev Server: running on http://localhost:3000 (port 3000 is listening)
Category A: Inbox / Messages
Endpoint: GET /api/campaigns/messages
Status: FAILING (UI-reported), backend auth test blocked
HTTP Status Code: 401 (direct curl without token)
Error Detail: "Missing authorization header" (direct curl)
Root Cause: No confirmed backend failure yet; likely frontend scoping gap for selected company context
Frontend sends: { direction, campaign_id, mine_only, all_companies, limit, offset }
API accepts: [company_id, all_companies, campaign_id, direction, mine_only, limit, offset]
Mismatch: No schema mismatch, but company_id is not forwarded by useInboxMessages() even when company context has it
Category B: Leads
Endpoint: GET /api/campaigns/, GET /api/linkedin/campaigns/, then GET /api/campaigns/{id}/leads / GET /api/linkedin/campaigns/{id}/leads
Status: FAILING (UI-reported), backend auth test blocked
HTTP Status Code: 401 (direct curl without token)
Error Detail: "Missing authorization header" (direct curl)
Root Cause: Undetermined without authenticated calls
Frontend sends:
campaign lists: { company_id?, mine_only? } (not forwarding all_companies)
leads-by-campaign: path param only, no query
API accepts:
campaign lists: [company_id, all_companies, mine_only]
leads-by-campaign: [] query params
Mismatch: No hard schema mismatch
Category C: Direct Mail Analytics
Endpoint: GET /api/analytics/direct-mail
Status: FAILING (UI-reported), backend auth test blocked
HTTP Status Code: 401 (direct curl without token)
Error Detail: "Missing authorization header" (direct curl)
Root Cause: Undetermined; could be data/provisioning/permissions at runtime
Frontend sends: { company_id?, all_companies?, from_ts?, to_ts? }
API accepts: [company_id, all_companies, from_ts, to_ts, limit, offset, max_rows]
Mismatch: No
Category D: Direct Mail Pieces
Endpoints: GET /api/direct-mail/postcards, /letters, /self-mailers, /checks
Status: FAILING (UI-reported), backend auth test blocked
HTTP Status Code: 401 (direct curl without token)
Error Detail: "Missing authorization header" (direct curl)
Root Cause: Likely not query-schema mismatch; possible provisioning/permission/data issue at runtime
Frontend sends: {} (no company filter in useDirectMailPieces)
API accepts: [company_id] (optional)
Mismatch: No schema mismatch, but company context is not propagated here (possible incorrect tenant scoping behavior)
Category E: Dashboard Analytics
Endpoints:
GET /api/analytics/campaigns
GET /api/analytics/clients
GET /api/analytics/reliability
GET /api/analytics/message-sync-health
POST /api/email-outreach/workspace/stats
Status: PARTIALLY LIKELY FAILING in UI, backend auth test blocked
HTTP Status Code: 401 for all above (direct curl without token)
Error Detail: "Missing authorization header" (direct curl)
Root Cause: Undetermined without authenticated token
Frontend sends:
campaigns: { company_id?, mine_only?, from_ts?, to_ts? }
clients: { company_id?, mine_only?, from_ts?, to_ts? }
reliability: { company_id?, from_ts?, to_ts? }
message-sync-health: { company_id? }
workspace stats: body { start_date, end_date } (no query)
API accepts:
campaigns: [company_id, from_ts, to_ts, mine_only]
clients: [company_id, from_ts, to_ts, mine_only]
reliability: [company_id, provider_slug, from_ts, to_ts]
message-sync-health: [company_id, campaign_id, message_sync_status]
workspace stats: no query, required body [start_date, end_date]
Mismatch: No
Category F: Campaign List
Endpoints: GET /api/campaigns/, GET /api/linkedin/campaigns/
Status: FAILING (UI-reported), backend auth test blocked
HTTP Status Code: 401 (direct curl without token)
Error Detail: "Missing authorization header" (direct curl)
Root Cause: Undetermined (could be no data, backend issue, or auth/session issue in-browser)
Frontend sends: { company_id?, mine_only? }
API accepts: [company_id, all_companies, mine_only]
Mismatch: No
Summary
Total failing endpoint categories: 6/6 reported by UI, but 0/6 conclusively diagnosed with authenticated backend responses (token unavailable for curl)
Root cause breakdown (confirmed from investigation):
Param mismatch: 0 endpoints confirmed
No data: 0 confirmed (cannot verify without auth)
Backend error (4xx/5xx besides auth): 0 confirmed (cannot verify without auth)
Auth issue: all direct curl calls return 401 without token (expected for unauthenticated requests)
Provisioning issue: 0 confirmed, but Direct Mail remains a strong candidate once authenticated tests are run
Key frontend findings:
useInboxMessages() does not propagate company_id even though API supports it
useDirectMailPieces() list calls do not propagate company context (company_id) at all
Most category endpoints are typed against OpenAPI query contracts and appear schema-compatible
Proposed Fixes (do not implement)
Run an authenticated endpoint matrix (same endpoints) using a valid JWT from browser/localStorage or login credentials; capture exact status/body per endpoint and company context (company_id selected vs all companies).
Ensure company-context propagation consistency:
inbox messages should include company_id when selected
direct-mail piece list endpoints should optionally receive company_id
Standardize tenant-scoping behavior for org admin list endpoints (company_id vs all_companies) and avoid implicit defaults.
Improve frontend error surfacing by displaying backend detail from API responses instead of generic "Failed to load..." strings to distinguish no-data vs entitlement vs validation vs server errors quickly.
Are these proposed fixes meant to fix the categories of issues? Or are they meant to diagnose them etc? Clarify concisely.

They’re remediation-oriented next steps, not pure diagnosis.
#1 is still diagnostic (gets definitive per-endpoint cause with auth + real response bodies).
#2–#4 are fixes/improvements to prevent or resolve issue categories:
#2/#3 address likely frontend scoping/filter bugs
#4 improves observability so future failures are diagnosable quickly
So: mixed list, with only #1 being strictly diagnostic.
And you suggest the fixes happen "across categories" rather than tackling "each category" discretely? Clarify for me. I am asking sincerely, not begging the q

Yes — intentionally across categories first.
Because the strongest signals are shared infrastructure issues (auth context + company filter propagation), fixing those centrally can clear multiple categories at once. Doing each category in isolation first would likely duplicate effort and mask the common root cause.
Practical sequence:
Cross-cutting first: authenticated test matrix + filter propagation consistency.
Then discrete per-category pass: only for categories still failing after step 1 (likely true backend/provisioning/data gaps).
So it’s not “ignore categories”; it’s “remove shared failure modes first, then isolate true category-specific defects.”
Got it. Ok. What is next step here to move forward with this.

Next step is to complete the authenticated diagnostic matrix (this is the blocker).
Provide either:
a temporary test login (email + password), or
a current JWT from browser localStorage.token.
Then run all 6 categories with that token and capture, per endpoint:
HTTP status
response body detail
request params actually sent (company_id vs all_companies)
Run each call twice:
All Companies selected
Nexus Labs selected
That will let us definitively label each failure as: backend error, param mismatch, no data, or provisioning issue.
If you want, I can do that immediately once you share token/credentials.
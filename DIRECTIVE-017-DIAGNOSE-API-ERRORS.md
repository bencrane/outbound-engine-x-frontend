# Directive #17: Diagnose API Errors (Investigation Only — DO NOT FIX)

## Context

This is a Next.js 16 / React 19 / TypeScript frontend at `src/`. The backend API is at `https://api.outboundengine.dev` (configured via `NEXT_PUBLIC_API_BASE_URL` in `.env.local`). The API client is at `src/lib/api-client.ts` using `openapi-fetch`. Authentication is via JWT Bearer token stored in `localStorage`.

The app is running at `http://localhost:3000`. The user is logged in as `org_admin` with a company selected ("Nexus Labs") via a company context switcher.

Multiple pages show "Failed to load..." error messages. We need to determine whether these are:
1. **Backend API errors** (endpoints returning 4xx/5xx)
2. **Frontend bugs** (malformed requests, wrong params, type mismatches)
3. **Missing data** (no campaigns/messages/leads exist yet for this company)
4. **Entitlement/provisioning issues** (company not provisioned for certain capabilities)

## YOUR TASK

**Investigate and report findings. DO NOT make any code changes. DO NOT fix anything.**

Produce a structured diagnostic report with findings per page/endpoint.

---

## Investigation Steps

### Step 1: Check the Environment

1. Read `src/lib/api-client.ts` to understand the API client setup (base URL, auth middleware, error handling)
2. Read `.env.local` to confirm the API base URL
3. Verify the dev server is running (check terminals folder)

### Step 2: Test API Connectivity Directly

Use `curl` commands to test the backend API directly (bypass the frontend entirely). You'll need the auth token — read it from the browser or use the login endpoint:

```bash
# Login to get a token
curl -s -X POST https://api.outboundengine.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "<check .env.local or ask>", "password": "<ask>"}' | python3 -m json.tool

# Then use the token for subsequent calls
TOKEN="<token from login>"
```

If you can't get credentials, skip to Step 3 and diagnose from the frontend code.

### Step 3: Test Each Failing Endpoint Category

For each category below, test the endpoint with curl (if you have a token) AND examine the frontend code to check if the request is being constructed correctly.

#### Category A: Inbox / Messages
- Endpoint: `GET /api/campaigns/messages`
- Frontend: `src/features/inbox/api.ts` → `useInboxMessages()`
- Page: `src/app/(protected)/inbox/page.tsx`
- **Check**: What query params are being passed? Is `company_id` being sent? Does the endpoint accept `company_id` as a filter? What does the API return?

#### Category B: Leads (via campaign queries)
- Endpoint: `GET /api/campaigns/` and `GET /api/linkedin/campaigns/`
- Then per-campaign: `GET /api/campaigns/{id}/leads`
- Frontend: `src/features/leads/api.ts` → `useAllLeads()`
- Page: `src/app/(protected)/leads/page.tsx`
- **Check**: Are campaigns loading? If campaigns load but leads fail, is it a per-campaign issue? If campaigns themselves fail, what error?

#### Category C: Direct Mail Analytics
- Endpoint: `GET /api/analytics/direct-mail`
- Frontend: `src/features/direct-mail/api.ts` → `useDirectMailAnalytics()`
- Components: `src/features/direct-mail/components/analytics-tab.tsx`, `src/features/direct-mail/components/dashboard-section.tsx`
- **Check**: What query params are sent? Does the company have direct mail provisioned? What HTTP status does the API return?

#### Category D: Direct Mail Pieces
- Endpoints: `GET /api/direct-mail/postcards`, `/letters`, `/self-mailers`, `/checks`
- Frontend: `src/features/direct-mail/api.ts` → `useDirectMailPieces()`
- **Check**: Same as above — are these failing because the company isn't provisioned for direct mail, or because the endpoints return errors?

#### Category E: Dashboard Analytics
- Endpoints: `GET /api/analytics/campaigns`, `GET /api/analytics/clients`, `GET /api/analytics/reliability`, `GET /api/analytics/message-sync-health`, `POST /api/email-outreach/workspace/stats`
- Frontend: `src/features/analytics/api.ts`
- Page: `src/app/(protected)/dashboard/page.tsx`
- **Check**: Which of these are failing vs succeeding? The dashboard might partially load.

#### Category F: Campaign List
- Endpoints: `GET /api/campaigns/`, `GET /api/linkedin/campaigns/`
- Page: `src/app/(protected)/campaigns/page.tsx`
- **Check**: Do these return empty arrays (no campaigns) or errors?

### Step 4: Check Company Context Filter Propagation

The company context switcher (`src/lib/company-context.tsx`) injects `company_id` or `all_companies` filters into API calls. Check:

1. Read `src/lib/company-context.tsx` → `useCompanyFilters()` to see what filters are produced
2. For each failing page, trace how `useCompanyFilters()` is spread into the API hook call
3. Check if any endpoints don't accept `company_id` as a query param (compare against `openapi.json`)
4. Check if passing `company_id` to an endpoint that doesn't support it causes a 422 Validation Error

This is a likely culprit — some endpoints may accept `company_id` while others don't, and the company context switcher may be blindly passing it everywhere.

### Step 5: Check the OpenAPI Spec for Param Support

For each failing endpoint, check `openapi.json` to see which query parameters it actually accepts. Compare against what the frontend is sending.

```bash
# Example: check what params /api/campaigns/messages accepts
python3 -c "
import json
with open('openapi.json') as f:
    spec = json.load(f)
path = '/api/campaigns/messages'
op = spec['paths'][path]['get']
params = [p for p in op.get('parameters', []) if p['in'] == 'query']
for p in params:
    print(f'{p[\"name\"]}: {p.get(\"schema\", {})}')
"
```

Run this for every failing endpoint to verify param compatibility.

### Step 6: Check Error Response Bodies

If you can run curl tests, capture the full error response body. The API returns `{ "detail": "..." }` for errors. The specific error message will tell us if it's:
- 401 Unauthorized (token issue)
- 403 Forbidden (permission issue)  
- 404 Not Found (endpoint doesn't exist)
- 422 Validation Error (bad params — this is the most likely issue with company_id)
- 500 Internal Server Error (backend bug)

---

## Report Format

Produce your findings as a structured report with this format:

```
## Diagnostic Report

### Environment
- API Base URL: ...
- Auth Status: working / not working
- Dev Server: running / not running

### Category A: Inbox / Messages
- Endpoint: GET /api/campaigns/messages
- Status: FAILING / WORKING
- HTTP Status Code: ...
- Error Detail: "..."
- Root Cause: [param mismatch / no data / backend error / ...]
- Frontend sends: { company_id: "...", all_companies: true, ... }
- API accepts: [list of accepted params from openapi.json]
- Mismatch: [yes/no — describe]

### Category B: Leads
... (same format)

### Category C: Direct Mail Analytics
... (same format)

(repeat for each category)

### Summary
- Total failing endpoint categories: X/6
- Root cause breakdown:
  - Param mismatch: X endpoints
  - No data: X endpoints
  - Backend error: X endpoints
  - Auth issue: X endpoints
  - Provisioning issue: X endpoints

### Proposed Fixes (do not implement)
1. ...
2. ...
3. ...
```

---

## CRITICAL RULES

1. **DO NOT modify any files**
2. **DO NOT fix any bugs**
3. **DO NOT change any code**
4. Only read files, run curl commands, and run diagnostic python scripts against openapi.json
5. Your output is a diagnostic report, nothing else

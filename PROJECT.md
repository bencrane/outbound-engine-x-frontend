# Outbound Engine X - Frontend

## Overview

Outbound Engine X is a multi-channel outreach platform. This frontend provides the UI for managing email campaigns, LinkedIn outreach, leads, and a unified inbox for replies.

The backend API is documented in `openapi.json` (387KB OpenAPI 3.x spec).

---

## Authentication

**API Base URL:** `https://api.outboundengine.dev`

### Regular User Auth (current implementation)
- **Login:** `POST /api/auth/login` with `{ email, password }` returns `{ access_token, token_type }`
- **Current User:** `GET /api/auth/me` returns `{ user_id, org_id, company_id, role, permissions, auth_method }`
- Token is stored in `localStorage` and sent as `Authorization: Bearer <token>`

### Super Admin Auth (not currently used)
- **Login:** `POST /api/super-admin/login`
- **Current User:** `GET /api/super-admin/me` returns `{ super_admin_id, email }`

---

## User Roles & Views

| Role | Description | What They See |
|------|-------------|---------------|
| **Super Admin** | Platform operator | All organizations, system health, cross-client analytics |
| **Org Admin** | Client organization admin | Their org's dashboard, all campaigns, team management, settings |
| **Salesperson** | End user | Master inbox (replies), their LinkedIn inbox, assigned campaigns |

The JWT contains `org_id` and `company_id` which automatically scopes all API requests to that tenant.

---

## Data Hierarchy

```
Organization (org_id)
├── Companies (company_id) - sub-accounts or teams within an org
│   ├── Users (user_id)
│   ├── Campaigns
│   │   ├── Leads
│   │   ├── Sequence Steps
│   │   └── Replies
│   └── Inboxes (sender email accounts)
```

---

## Core API Endpoints

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns/` | List all campaigns (scoped by JWT) |
| POST | `/api/campaigns/` | Create campaign |
| GET | `/api/campaigns/{campaign_id}` | Get campaign details |
| GET | `/api/campaigns/{campaign_id}/leads` | List leads in campaign |
| GET | `/api/campaigns/{campaign_id}/replies` | List replies for campaign |
| GET | `/api/campaigns/{campaign_id}/sequence` | Get sequence steps |
| GET | `/api/campaigns/{campaign_id}/analytics/summary` | Campaign analytics |

### Campaign Response Schema
```json
{
  "id": "string",
  "company_id": "string",
  "provider_id": "string",
  "external_campaign_id": "string",
  "name": "string",
  "status": "DRAFTED | ACTIVE | PAUSED | STOPPED | COMPLETED",
  "created_by_user_id": "string | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns/{campaign_id}/leads` | List leads in a campaign |
| POST | `/api/campaigns/{campaign_id}/leads` | Add leads to campaign |

### Inboxes (Sender Accounts)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inboxes/` | List all sender email accounts |
| GET | `/api/inboxes/{inbox_id}/sender-email` | Get sender email details |

### Replies (Master Inbox)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns/{campaign_id}/replies` | List replies for a campaign |
| GET | `/api/campaigns/{campaign_id}/replies/{reply_id}` | Get single reply |
| GET | `/api/campaigns/{campaign_id}/replies/{reply_id}/thread` | Get full thread |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/campaigns` | Campaign analytics dashboard |
| GET | `/api/analytics/clients` | Per-company analytics rollup |

### Client Analytics Response Schema
```json
{
  "company_id": "string",
  "campaigns_total": "integer",
  "leads_total": "integer",
  "outbound_messages_total": "integer",
  "replies_total": "integer",
  "reply_rate": "number",
  "last_activity_at": "datetime | null",
  "updated_at": "datetime"
}
```

### LinkedIn
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/linkedin/campaigns/` | List LinkedIn campaigns |
| GET | `/api/linkedin/campaigns/{campaign_id}` | Get LinkedIn campaign |
| GET | `/api/linkedin/campaigns/{campaign_id}/leads` | Get LinkedIn campaign leads |

### Email Outreach (Bulk Operations)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/email-outreach/leads/bulk` | Bulk lead operations |
| POST | `/api/email-outreach/campaigns/bulk` | Bulk campaign operations |
| GET | `/api/email-outreach/tags` | List tags |
| GET | `/api/email-outreach/webhooks` | List webhooks |

---

## Current Frontend State

### Implemented
- Login page (`/login`) - working with `/api/auth/login`
- Auth context with JWT storage and `/api/auth/me`
- Protected route layout with auth check
- App shell with dark mode and sidebar navigation
- Placeholder pages for: Dashboard, Campaigns, Inbox, Leads, Settings

### File Structure
```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx (root layout, AuthProvider, dark mode)
│   ├── page.tsx (redirects to /dashboard or /login)
│   ├── login/
│   │   └── page.tsx
│   └── (protected)/
│       ├── layout.tsx (sidebar + auth guard)
│       ├── dashboard/
│       │   └── page.tsx
│       ├── campaigns/
│       │   └── page.tsx (placeholder)
│       ├── inbox/
│       │   └── page.tsx (placeholder)
│       ├── leads/
│       │   └── page.tsx (placeholder)
│       └── settings/
│           └── page.tsx (placeholder)
├── components/
│   └── sidebar.tsx
└── lib/
    ├── api.ts (fetch helpers, auth functions)
    └── auth-context.tsx (React context for auth state)
```

### Tech Stack
- Next.js 16.1.6 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- No data fetching library yet (raw fetch)

---

## What Needs to Be Built

### Pages to Implement

1. **Dashboard** (`/dashboard`)
   - Display aggregate stats from `/api/analytics/clients` or `/api/analytics/campaigns`
   - Show recent activity

2. **Campaigns** (`/campaigns`)
   - List all campaigns from `GET /api/campaigns/`
   - Campaign detail page (`/campaigns/[id]`) showing leads, sequence, replies
   - Campaign analytics

3. **Inbox** (`/inbox`)
   - Unified view of replies across all campaigns
   - Need to aggregate from multiple campaign reply endpoints OR check if there's a unified inbox endpoint
   - Reply threading via `/api/campaigns/{campaign_id}/replies/{reply_id}/thread`

4. **Leads** (`/leads`)
   - List/search leads
   - Lead detail view with message history

5. **Settings** (`/settings`)
   - Workspace settings
   - Team/user management
   - Webhook configuration
   - Blocklist management

---

## Environment

- **API URL:** Set in `.env.local` as `NEXT_PUBLIC_API_BASE_URL=https://api.outboundengine.dev`
- **Dev server:** `npm run dev` runs on `http://localhost:3000`
- **OpenAPI spec:** Available at `/openapi.json` in this repo (copied from API repo)

---

## API Repo

The backend code is at: `/Users/benjamincrane/outbound-engine-x-api`

Refer to `openapi.json` for complete endpoint documentation including request/response schemas.

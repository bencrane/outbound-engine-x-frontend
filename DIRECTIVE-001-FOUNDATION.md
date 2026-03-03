# Directive #1: Foundation Infrastructure

## Context

You are working on the **Outbound Engine X** frontend — a multi-channel outreach platform (email via EmailBison, LinkedIn via HeyReach). This is a Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 app using the App Router.

The codebase currently has: login page, auth context, JWT storage, a protected layout with sidebar, and placeholder pages. The backend API is fully built and documented in `openapi.json` (15K+ lines, 130+ endpoints).

Your job is to **lay the foundation infrastructure** so that every subsequent feature page can be built quickly, type-safely, and with role-based access control from day one. You are NOT building any feature pages — only the plumbing.

---

## What Exists (DO NOT break these)

```
src/
├── app/
│   ├── globals.css          — Tailwind v4 import + CSS vars
│   ├── layout.tsx           — Root layout with AuthProvider, Geist fonts, dark mode
│   ├── page.tsx             — Redirects to /dashboard or /login
│   ├── login/page.tsx       — Working login form hitting POST /api/auth/login
│   └── (protected)/
│       ├── layout.tsx       — Auth guard + sidebar shell
│       ├── dashboard/page.tsx — Placeholder with stat cards
│       ├── campaigns/page.tsx — Placeholder
│       ├── inbox/page.tsx     — Placeholder
│       ├── leads/page.tsx     — Placeholder
│       └── settings/page.tsx  — Placeholder
├── components/
│   └── sidebar.tsx          — Navigation with hand-rolled SVG icons
└── lib/
    ├── api.ts               — apiFetch<T>(), login(), getCurrentUser(), token helpers
    └── auth-context.tsx     — React context: user, isLoading, isAuthenticated, login, logout
```

Key details about existing code:
- `apiFetch<T>()` in `src/lib/api.ts` is a generic fetch wrapper that adds Bearer token and handles errors
- Auth context stores a `User` type with `{ user_id, org_id, company_id, role, permissions, auth_method }`
- The protected layout redirects to `/login` if not authenticated
- Sidebar has hardcoded nav items with inline SVG icon components
- `globals.css` uses Tailwind v4 syntax (`@import "tailwindcss"` and `@theme inline {}`)
- `package.json` name is `nextjs-temp` — dependencies are minimal (next, react, react-dom + tailwind/eslint dev deps)
- React Compiler is enabled (`reactCompiler: true` in `next.config.ts`, `babel-plugin-react-compiler` in devDeps)

---

## Tasks To Complete (in order)

### 1. Install Dependencies

```bash
npm install @tanstack/react-query openapi-fetch lucide-react clsx tailwind-merge class-variance-authority
npm install -D openapi-typescript
```

- **@tanstack/react-query** — data fetching, caching, mutation management
- **openapi-fetch** — type-safe fetch client generated from OpenAPI spec (pairs with openapi-typescript)
- **lucide-react** — icon library (replaces hand-rolled SVGs in sidebar)
- **clsx + tailwind-merge + class-variance-authority** — utility for composing class names (needed by shadcn/ui pattern)
- **openapi-typescript** (dev) — generates TypeScript types from `openapi.json`

### 2. Generate TypeScript Types from OpenAPI Spec

Add a script to `package.json`:
```json
"generate-types": "openapi-typescript openapi.json -o src/lib/api-types.ts"
```

Run it to produce `src/lib/api-types.ts`. This generates types for every request body, response, and path parameter in the API. **Do not hand-write API types after this** — they come from the spec.

### 3. Create the Typed API Client

Create `src/lib/api-client.ts`:

- Use `openapi-fetch`'s `createClient` with the generated types
- Configure it with the base URL from `NEXT_PUBLIC_API_BASE_URL`
- Add a middleware/interceptor that attaches the Bearer token from localStorage on every request
- Add a middleware that handles 401 responses (clear token, redirect to login)
- Export the client instance

The existing `src/lib/api.ts` should be kept for now (it has the login function and token helpers that auth-context.tsx depends on). The new `api-client.ts` is what all feature code will use going forward.

### 4. Set Up TanStack Query Provider

Create `src/lib/query-client.ts`:
- Export a `QueryClient` instance with sensible defaults (staleTime: 30s, retry: 1, refetchOnWindowFocus: true)

Update `src/app/layout.tsx`:
- Wrap children with `QueryClientProvider` (must be a client component — create a `src/components/providers.tsx` client component that wraps both `AuthProvider` and `QueryClientProvider`, then use that in the server-component root layout)

### 5. Create the `cn()` Utility

Create `src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

This is the standard shadcn/ui utility function. Every UI component will use it.

### 6. Set Up shadcn/ui Foundation

We are NOT using the shadcn CLI installer (it doesn't play well with Tailwind v4's new config format). Instead, manually set up the foundation:

Create `src/components/ui/button.tsx` — a Button component using `class-variance-authority` for variants (default, destructive, outline, secondary, ghost, link) and sizes (default, sm, lg, icon). Use the `cn()` utility. Follow the shadcn/ui Button pattern exactly. Use a dark-mode-first color palette based on zinc (matching the existing app). The default variant should be a solid blue button (like the existing login button uses `bg-blue-600`).

Create `src/components/ui/badge.tsx` — for status indicators (campaign statuses, lead statuses).

Create `src/components/ui/card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter.

Create `src/components/ui/skeleton.tsx` — for loading states.

These four are enough to start. More will be added per-feature.

### 7. Create the RBAC / Permissions System

The backend returns these roles on the `MeResponse` (from `GET /api/auth/me`):
- **`org_admin`** — Platform operator (Outbound Solutions). Sees everything.
- **`company_admin`** — Client organization admin. Sees their company's campaigns, inbox, leads, some settings.
- **`company_member`** — Salesperson/end user. Sees inbox (replies), their LinkedIn inbox, assigned campaigns. Cannot manage campaigns or settings.

Create `src/lib/permissions.ts`:

```typescript
export type Role = "org_admin" | "company_admin" | "company_member";

export type Permission =
  | "dashboard.view"
  | "campaigns.list"
  | "campaigns.create"
  | "campaigns.manage"
  | "inbox.view"
  | "leads.list"
  | "leads.manage"
  | "settings.view"
  | "settings.manage"
  | "analytics.view"
  | "inboxes.manage"
  | "users.manage";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  org_admin: [
    "dashboard.view",
    "campaigns.list",
    "campaigns.create",
    "campaigns.manage",
    "inbox.view",
    "leads.list",
    "leads.manage",
    "settings.view",
    "settings.manage",
    "analytics.view",
    "inboxes.manage",
    "users.manage",
  ],
  company_admin: [
    "dashboard.view",
    "campaigns.list",
    "inbox.view",
    "leads.list",
    "settings.view",
    "analytics.view",
  ],
  company_member: [
    "inbox.view",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
```

Create `src/components/gate.tsx`:

A `<Gate>` component that conditionally renders children based on the current user's role:

```tsx
interface GateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

It reads the user's role from `useAuth()` and checks `hasPermission()`. If the user lacks the permission, it renders `fallback` (default: nothing).

Also export a `usePermission(permission: Permission): boolean` hook for imperative checks.

### 8. Update the Sidebar to be Role-Aware and Use Lucide Icons

Refactor `src/components/sidebar.tsx`:

- Replace all hand-rolled SVG icon components with `lucide-react` icons: `LayoutDashboard`, `Megaphone`, `Inbox`, `Users`, `Settings`, `LogOut`
- Add a `permission` field to each nav item
- Filter nav items through the permissions system so users only see what they have access to
- The sidebar should be clean and minimal — keep the existing dark zinc aesthetic

Nav items with their permissions:
| Item | Href | Icon | Permission |
|------|------|------|------------|
| Dashboard | /dashboard | LayoutDashboard | dashboard.view |
| Campaigns | /campaigns | Megaphone | campaigns.list |
| Inbox | /inbox | Inbox | inbox.view |
| Leads | /leads | Users | leads.list |
| Settings | /settings | Settings | settings.view |

### 9. Establish Feature Folder Structure

Create the following empty directory structure (with `.gitkeep` files or barrel `index.ts` files):

```
src/features/
├── campaigns/
│   ├── api.ts       — (empty, placeholder comment: "Campaign API hooks")
│   └── components/  — (empty dir)
├── inbox/
│   ├── api.ts
│   └── components/
├── leads/
│   ├── api.ts
│   └── components/
├── analytics/
│   ├── api.ts
│   └── components/
└── settings/
    ├── api.ts
    └── components/
```

Each `api.ts` should have a single comment like:
```typescript
// Campaign query hooks and mutations — to be implemented
```

This establishes the convention that feature code lives in `src/features/`, not scattered across `src/lib/` or `src/components/`.

### 10. Add Route-Level Permission Guards

Update `src/app/(protected)/layout.tsx`:

The current layout only checks if the user is authenticated. It does NOT need to check per-route permissions (the sidebar already hides unauthorized nav items). However, we need to handle direct URL access.

Create a `src/components/route-guard.tsx` component that:
- Takes a `permission: Permission` prop
- If the user lacks the permission, shows a "You don't have access to this page" message with a link back to their default landing page
- The default landing page for `company_member` is `/inbox`, for everyone else it's `/dashboard`

Then update each placeholder page to wrap its content with `<RouteGuard permission="...">`:
- `/dashboard` → `dashboard.view`
- `/campaigns` → `campaigns.list`
- `/inbox` → `inbox.view`
- `/leads` → `leads.list`
- `/settings` → `settings.view`

---

## Design Constraints

- **Dark mode first.** The app uses `className="dark"` on `<html>`. All colors should be zinc-based dark theme. Accent color is blue-600.
- **Tailwind v4.** Do NOT create a `tailwind.config.ts` file — Tailwind v4 uses CSS-based config via `@theme` in `globals.css`. The existing setup is correct.
- **React Compiler is on.** Do not use `useMemo`/`useCallback` unnecessarily — the compiler handles this. But do NOT remove existing `useCallback` usage in `auth-context.tsx` (don't touch that file beyond what's specified).
- **Keep the login flow working.** The existing login page, `api.ts`, and `auth-context.tsx` must continue to function. The new `api-client.ts` is additive, not a replacement (yet).
- **No pages to build.** You are building infrastructure only. The placeholder pages should remain placeholders (with the RouteGuard wrapper added). The next directive will build real pages on top of this foundation.

---

## Acceptance Criteria

1. `npm run generate-types` produces `src/lib/api-types.ts` with types for all API endpoints
2. `src/lib/api-client.ts` exports a typed `openapi-fetch` client that attaches auth headers
3. TanStack Query is wired up in the root layout via a Providers component
4. `cn()` utility exists at `src/lib/utils.ts`
5. Four shadcn/ui-style components exist: Button, Badge, Card, Skeleton
6. `src/lib/permissions.ts` defines the RBAC system with three roles
7. `<Gate>` component and `usePermission` hook work correctly
8. Sidebar uses lucide-react icons and filters nav items by role
9. Feature folder structure exists under `src/features/`
10. Route guards are on all protected pages
11. `npm run build` succeeds with zero TypeScript errors
12. The login flow still works end-to-end
13. The app renders correctly for an `org_admin` user (sees all nav items)

---

## Files You Will Create

| File | Purpose |
|------|---------|
| `src/lib/api-types.ts` | Generated OpenAPI types (via script) |
| `src/lib/api-client.ts` | Typed openapi-fetch client |
| `src/lib/query-client.ts` | TanStack Query client config |
| `src/lib/utils.ts` | `cn()` utility |
| `src/lib/permissions.ts` | RBAC role→permission mapping |
| `src/components/providers.tsx` | Combined AuthProvider + QueryClientProvider |
| `src/components/gate.tsx` | Permission gate component + hook |
| `src/components/route-guard.tsx` | Page-level permission guard |
| `src/components/ui/button.tsx` | Button component |
| `src/components/ui/badge.tsx` | Badge component |
| `src/components/ui/card.tsx` | Card component |
| `src/components/ui/skeleton.tsx` | Skeleton loading component |
| `src/features/campaigns/api.ts` | Placeholder |
| `src/features/inbox/api.ts` | Placeholder |
| `src/features/leads/api.ts` | Placeholder |
| `src/features/analytics/api.ts` | Placeholder |
| `src/features/settings/api.ts` | Placeholder |

## Files You Will Modify

| File | Change |
|------|--------|
| `package.json` | Add dependencies + `generate-types` script |
| `src/app/layout.tsx` | Replace AuthProvider with Providers component |
| `src/components/sidebar.tsx` | Lucide icons + permission filtering |
| `src/app/(protected)/dashboard/page.tsx` | Add RouteGuard wrapper |
| `src/app/(protected)/campaigns/page.tsx` | Add RouteGuard wrapper |
| `src/app/(protected)/inbox/page.tsx` | Add RouteGuard wrapper |
| `src/app/(protected)/leads/page.tsx` | Add RouteGuard wrapper |
| `src/app/(protected)/settings/page.tsx` | Add RouteGuard wrapper |

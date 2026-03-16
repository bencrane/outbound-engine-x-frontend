# D29: Replace chat tools with search + list management

**Repo:** `/Users/benjamincrane/outbound-engine-x-frontend/`
**Scope:** Only modify `src/app/api/chat/route.ts`. Do NOT touch chat-package, chat page, layout, providers, or any other files.

---

## Context

The chat route at `src/app/api/chat/route.ts` currently defines 3 tools: `queryLeads`, `getCompany`, `getPerson`. All call data-engine-x via a `dataEngineFetch()` helper using `DATAENGINE_API_TOKEN` Bearer auth.

Data Engine X has shipped new endpoints that replace and extend the chat agent's capabilities:
- **Intent-based search** (`POST /api/v1/search`) replaces the old `queryLeads` tool
- **List management** (`/api/v1/lists/*`) is new — allows the agent to create lists, add members, export
- **Bulk enrichment** (`POST /api/v1/execute`) is new — enriches company data via multi-provider waterfall

## Architecture Rules (do not violate)

- This route runs **server-side** in Next.js. It holds API keys and makes authenticated calls to external services.
- The browser NEVER sees `ANTHROPIC_API_KEY`, `DATAENGINE_API_TOKEN`, or any server-side secrets.
- Tools are defined and executed HERE, not in the browser, not in Cloud.
- Do NOT change the `SYSTEM_PROMPT`. That is a separate phase.
- Do NOT change the `dataEngineFetch()` helper signature or the auth pattern.
- Do NOT change how `frontendTools`, `streamText`, `convertToModelMessages`, or `stopWhen` are configured.
- Do NOT install new packages. Everything needed is already installed (`ai`, `zod`, `@ai-sdk/anthropic`, `@assistant-ui/react-ai-sdk`).

## Files to Read Before Modifying

Read the full file before making any changes:
- `src/app/api/chat/route.ts` — the file you are modifying

## Current State of route.ts

The file has this structure (read it to confirm, but this is accurate as of D29):

```
imports (anthropic, streamText, convertToModelMessages, stepCountIs, tool, UIMessage, frontendTools, z)
↓
DATAENGINE_BASE constant (from NEXT_PUBLIC_DEX_API_BASE_URL env var)
↓
SYSTEM_PROMPT constant (DO NOT TOUCH)
↓
dataEngineFetch() helper (POST-only, Bearer auth, error handling → returns { error } on failure)
↓
POST handler:
  - Destructures { messages, tools: clientTools } from request body
  - Calls streamText() with model, system, messages, stopWhen, tools
  - tools object merges frontendTools(...) with server-side tools
  - Returns result.toUIMessageStreamResponse()
```

## What to Change

### The `dataEngineFetch()` helper

The current helper only supports POST. Several new endpoints use GET and DELETE. Extend it to support all methods:

```ts
async function dataEngineFetch(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    body?: Record<string, unknown>;
  } = {}
) {
  const token = process.env.DATAENGINE_API_TOKEN;
  if (!token) {
    return { error: "Data Engine API is not configured." };
  }

  const { method = "POST", body } = options;

  try {
    const res = await fetch(`${DATAENGINE_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      return { error: `Data Engine returned status ${res.status}.` };
    }

    return await res.json();
  } catch {
    return { error: "Failed to reach Data Engine API." };
  }
}
```

### Tools to Remove

**Remove `queryLeads`.** It is fully replaced by `searchEntities`.

### Tools to Keep (unchanged)

**Keep `getCompany` and `getPerson`** exactly as they are. They still serve single-entity lookups by entity_id and hit different endpoints (`/v1/entities/*`) than the new search.

### Tools to Add

Add the following 7 tools to the `tools` object inside `streamText()`, alongside the existing `getCompany` and `getPerson`.

---

#### `searchEntities`

**Endpoint:** `POST /api/v1/search`

**Description for Claude:**
```
"Search for companies or people matching criteria. Use this for any discovery or filtering request — e.g. 'find staffing companies in Texas', 'show me VPs of Sales at SaaS companies'. Supports filtering by industry, seniority, department, job title, location, company domain, company name, employee range, and free-text query. Always set search_type to 'companies' or 'people' based on what the user is looking for."
```

**Parameters (Zod schema):**
```ts
z.object({
  search_type: z.enum(["companies", "people"]).describe("Whether to search for companies or people"),
  criteria: z.record(z.union([z.string(), z.array(z.string())])).describe(
    "Search filters. Valid keys: seniority, department, industry, employee_range, company_type, continent, country_code, query, company_domain, company_name, company_linkedin_url, job_title, location. Values can be strings or arrays of strings."
  ),
  provider: z.string().optional().describe("Force a specific provider: 'prospeo' or 'blitzapi'. Omit to auto-select."),
  limit: z.number().optional().default(25).describe("Max results per page (1-100)"),
  page: z.number().optional().default(1).describe("Page number for pagination"),
})
```

**Execute:** Call `dataEngineFetch("/v1/search", { body: params })`.

---

#### `saveList`

**Endpoint:** `POST /api/v1/lists` then optionally `POST /api/v1/lists/{list_id}/members`

**Description for Claude:**
```
"Create a named list and optionally add members to it. Use this when the user wants to save search results — e.g. 'save these as a list called Q3 Prospects'. Pass entity_type matching the search_type used to find the results. If members are provided, they are the raw result objects from searchEntities."
```

**Parameters:**
```ts
z.object({
  name: z.string().describe("Name for the list"),
  description: z.string().optional().describe("Optional description"),
  entity_type: z.enum(["companies", "people"]).describe("Type of entities in this list"),
  members: z.array(z.record(z.any())).optional().describe("Array of result objects from searchEntities to add to the list. Max 500."),
})
```

**Execute:** Two-step:
1. Create the list: `dataEngineFetch("/v1/lists", { body: { name, description, entity_type } })`
2. If `members` is provided and non-empty, extract the list ID from step 1's response and add members: `dataEngineFetch("/v1/lists/${listId}/members", { body: { members } })`
3. Return the combined result. If step 1 fails, return the error. If step 2 fails, return the created list with a note that member addition failed.

---

#### `getLists`

**Endpoint:** `GET /api/v1/lists`

**Description for Claude:**
```
"Get all saved lists. Use this when the user asks to see their lists, or when you need to find a list by name before operating on it."
```

**Parameters:**
```ts
z.object({})
```

**Execute:** `dataEngineFetch("/v1/lists", { method: "GET" })`

---

#### `getList`

**Endpoint:** `GET /api/v1/lists/{list_id}`

**Description for Claude:**
```
"Get a specific list with its members. Use this when the user wants to see the contents of a list, or when you need member data for enrichment or export."
```

**Parameters:**
```ts
z.object({
  list_id: z.string().describe("The ID of the list to retrieve"),
})
```

**Execute:** `dataEngineFetch("/v1/lists/${list_id}", { method: "GET" })`

---

#### `addListMembers`

**Endpoint:** `POST /api/v1/lists/{list_id}/members`

**Description for Claude:**
```
"Add members to an existing list. Members are raw result objects from searchEntities. Max 500 per call. Use this when the user wants to add more results to a list that already exists."
```

**Parameters:**
```ts
z.object({
  list_id: z.string().describe("The ID of the list to add members to"),
  members: z.array(z.record(z.any())).describe("Array of result objects from searchEntities. Max 500."),
})
```

**Execute:** `dataEngineFetch("/v1/lists/${list_id}/members", { body: { members } })`

---

#### `enrichList`

**Endpoint:** `POST /api/v1/execute`

**Description for Claude:**
```
"Enrich companies in a list with additional data (emails, phone numbers, firmographics). First retrieves the list members, then sends them to the bulk enrichment pipeline. Use this when the user asks to enrich, find emails for, or get contact info for companies in a list."
```

**Parameters:**
```ts
z.object({
  list_id: z.string().describe("The ID of the list to enrich"),
  operation: z.enum(["company.enrich.bulk_prospeo", "company.enrich.bulk_profile"]).optional()
    .default("company.enrich.bulk_profile")
    .describe("Enrichment operation. 'company.enrich.bulk_profile' uses multi-provider waterfall (recommended). 'company.enrich.bulk_prospeo' uses Prospeo only."),
})
```

**Execute:** Multi-step:
1. Fetch the list: `dataEngineFetch("/v1/lists/${list_id}", { method: "GET" })`
2. If the list fetch fails or has no members, return an error.
3. Extract company data from `members[].snapshot_data` — map each member to an object with available fields: `company_domain`, `company_website`, `company_linkedin_url`, `company_name`, `source_company_id`.
4. The execute endpoint accepts max 50 companies per request. If the list has more than 50 members, batch into chunks of 50.
5. For each batch, call:
```ts
dataEngineFetch("/v1/execute", {
  body: {
    operation_id: operation,
    entity_type: "company",
    input: { companies: batch },
  }
})
```
6. Aggregate and return all batch results.

---

#### `exportList`

**Endpoint:** `GET /api/v1/lists/{list_id}/export`

**Description for Claude:**
```
"Export a list as a flat JSON array of member data. Use this when the user wants to export or download a list."
```

**Parameters:**
```ts
z.object({
  list_id: z.string().describe("The ID of the list to export"),
})
```

**Execute:** `dataEngineFetch("/v1/lists/${list_id}/export", { method: "GET" })`

---

## Deliverables

### Deliverable 1: Extend helper + remove old tool + add new tools

1. Extend `dataEngineFetch()` to support GET/POST/DELETE methods as shown above.
2. Remove the `queryLeads` tool definition entirely.
3. Keep `getCompany` and `getPerson` unchanged.
4. Add all 7 new tools (`searchEntities`, `saveList`, `getLists`, `getList`, `addListMembers`, `enrichList`, `exportList`) with exact descriptions, schemas, and execute functions as specified above.
5. Commit: `feat: replace queryLeads with search + list + enrich tools (D29)`

### Deliverable 2: Verify

1. Run `npx tsc --noEmit` — must pass with zero errors. No `as any` hacks.
2. Verify every tool's execute function handles errors by returning `{ error: "..." }`, never throwing.
3. Verify no server-side secrets appear in tool descriptions or error messages.
4. Commit any fixes if needed: `fix: resolve type errors in chat tools (D29)`

## Do NOT

- Modify the `SYSTEM_PROMPT` constant
- Modify how `streamText()` is called (model, system, messages, stopWhen)
- Modify `frontendTools` integration
- Touch any file other than `src/app/api/chat/route.ts`
- Install new packages
- Start dev servers or deploy
- Import from `assistant-cloud`

## Success Criteria

1. `src/app/api/chat/route.ts` compiles cleanly (`npx tsc --noEmit`)
2. `queryLeads` is gone
3. `getCompany` and `getPerson` are unchanged
4. 7 new tools are defined with correct endpoints, schemas, and descriptions
5. `dataEngineFetch()` supports GET, POST, and DELETE
6. `enrichList` correctly fetches list members, batches into chunks of 50, and calls `/v1/execute`
7. `saveList` correctly creates a list then adds members in a second call
8. All tool errors are caught and returned as `{ error: "..." }`, never thrown

## Data Engine X Contract Reference

Included here so the executor does not need to read the data-engine-x codebase.

### Search — `POST /api/v1/search`

Request:
```python
class IntentSearchRequest(BaseModel):
    search_type: Literal["companies", "people"]
    criteria: dict[str, str | list[str]]
    provider: str | None = None          # "prospeo", "blitzapi", or None (auto)
    limit: int = Field(default=25, ge=1, le=100)
    page: int = Field(default=1, ge=1)
```

Valid criteria keys (enum-resolved): `seniority`, `department`, `industry`, `employee_range`, `company_type`, `continent`, `sales_region`, `country_code`
Valid criteria keys (pass-through): `query`, `company_domain`, `company_name`, `company_linkedin_url`, `job_title`, `location`

Response:
```python
class IntentSearchOutput(BaseModel):
    search_type: str
    provider_used: str
    results: list[dict[str, Any]]
    result_count: int
    enum_resolution: dict[str, EnumResolutionDetail]
    unresolved_fields: list[str]
    pagination: dict[str, Any] | None = None
```

### Lists — `/api/v1/lists`

Create: `POST /api/v1/lists` — body: `{ name, description?, entity_type }`
Get all: `GET /api/v1/lists`
Get one: `GET /api/v1/lists/{list_id}` — returns `ListDetail` with `members` array
Add members: `POST /api/v1/lists/{list_id}/members` — body: `{ members: [raw search result dicts] }` — max 500
Remove members: `DELETE /api/v1/lists/{list_id}/members` — body: `{ member_ids: [UUIDs] }`
Delete list: `DELETE /api/v1/lists/{list_id}` — soft delete
Export: `GET /api/v1/lists/{list_id}/export` — returns flat `{ list_id, list_name, entity_type, member_count, members: [snapshot_data dicts] }`

Member objects: service extracts `entity_id` by checking for `entity_id`, `source_company_id`, or `source_person_id` (first valid UUID). Full dict stored as `snapshot_data`.

### Bulk Enrich — `POST /api/v1/execute`

Request:
```python
class ExecuteV1Request(BaseModel):
    operation_id: str                      # "company.enrich.bulk_prospeo" or "company.enrich.bulk_profile"
    entity_type: Literal["company"]
    input: dict[str, Any]                  # { "companies": [...] }
    options: dict[str, Any] | None = None
```

Input shape per company: `{ company_domain?, company_website?, company_linkedin_url?, company_name?, source_company_id? }` — at least one identifier required. Max 50 companies per request.

### Auth

All endpoints: `Authorization: Bearer <token>`. No exceptions for protected routes.

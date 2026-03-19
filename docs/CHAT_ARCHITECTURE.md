# Chat Architecture — OEX Frontend

> Canonical source of truth. Verified 2026-03-19 via runtime testing (console.log in POST handler, curl to /api/chat, source inspection of node_modules).

---

## 1. Message Flow

```
Browser → ChatInterface (chat-package) → useChatRuntime({ cloud })
  ├── Thread management → assistant-ui Cloud
  │     create / list / get / rename / archive / delete threads
  │     message history persistence
  │     thread title auto-generation
  │     file attachment storage
  │
  └── Chat messages → POST /api/chat (Next.js route, server-side)
                        → Anthropic API (Claude Sonnet)
                        → Server-side tools → Data Engine X API
                        → Streamed response back to browser
```

### How this works under the hood

`useChatRuntime({ cloud })` does two things:

1. **Thread list adapter** — the `cloud` param is passed to `useCloudThreadListAdapter()`, which calls `cloud.threads.*` for CRUD. This is the only thing Cloud does.
2. **Chat transport** — the remaining options (none, since only `cloud` is passed) go to `useChatThreadRuntime()`, which defaults to `new AssistantChatTransport()`. This extends `DefaultChatTransport` from the `ai` package, which defaults `api` to `"/api/chat"`. Messages are POSTed to your Next.js route.

Cloud does **not** proxy, intercept, or participate in LLM calls.

---

## 2. What assistant-ui Cloud Owns

Cloud is a **persistence and metadata layer only**.

| Capability | Method |
|---|---|
| List threads | `cloud.threads.list()` |
| Create thread | `cloud.threads.create()` |
| Get thread | `cloud.threads.get(threadId)` |
| Rename thread | `cloud.threads.update(threadId, { title })` |
| Archive/unarchive thread | `cloud.threads.update(threadId, { is_archived })` |
| Delete thread | `cloud.threads.delete(threadId)` |
| Auto-generate thread title | `cloud.runs.stream({ assistant_id: "system/thread_title" })` |
| Message history persistence | via `AssistantCloudThreadHistoryAdapter` |
| File attachments | via `CloudFileAttachmentAdapter` |

### What Cloud does NOT do

- Cloud does **not** make LLM calls
- Cloud does **not** execute tools
- Cloud does **not** hold the system prompt
- Cloud does **not** hold tool definitions
- Cloud does **not** call Anthropic

### Configuration

- **Env var:** `NEXT_PUBLIC_ASSISTANT_BASE_URL` — the Cloud project URL
- **Auth mode:** `anonymous: true` (no per-user identity)
- **Package:** `assistant-cloud@^0.1.21`
- **Init:** `new AssistantCloud({ baseUrl: cloudBaseUrl, anonymous: true })` in `ChatInterface`

---

## 3. What `/api/chat` Route Owns

File: `src/app/api/chat/route.ts`

This is the **active LLM endpoint**. It handles:

| Responsibility | Detail |
|---|---|
| LLM calls | Anthropic via `@ai-sdk/anthropic`, streamed with `streamText()` |
| System prompt | `SYSTEM_PROMPT` constant, lines 14-63 of route.ts |
| Server-side tools | 10 tools defined with `tool()` from `ai` + Zod schemas |
| Data Engine X integration | `dataEngineFetch()` helper with Bearer auth |
| Frontend tool merging | `frontendTools()` from `@assistant-ui/react-ai-sdk` |
| Response streaming | `result.toUIMessageStreamResponse()` |
| Step limiting | `stopWhen: stepCountIs(5)` |

### Auth

- `ANTHROPIC_API_KEY` — for LLM calls (server-side only, set in Doppler)
- `DATAENGINE_API_TOKEN` — for Data Engine X calls (server-side only, set in Doppler)
- `CHAT_MODEL` — model selection, defaults to `claude-sonnet-4-20250514`

---

## 4. Current Tools

All defined in `src/app/api/chat/route.ts`. All execute server-side. All call Data Engine X via `dataEngineFetch()`.

| Tool | Description | Endpoint |
|---|---|---|
| `getSearchFilters` | Get valid filter fields/values for a provider + entity type | `GET /api/v1/search/filters` |
| `getCompany` | Look up a single company by entity ID | `POST /api/v1/entities/companies` |
| `getPerson` | Look up a single person by entity ID | `POST /api/v1/entities/persons` |
| `searchEntities` | Search companies or people with filter criteria | `POST /api/v1/search` |
| `saveList` | Create a named list, optionally add members | `POST /api/v1/lists` + `POST /api/v1/lists/{id}/members` |
| `getLists` | Get all saved lists | `GET /api/v1/lists` |
| `getList` | Get a specific list with members | `GET /api/v1/lists/{id}` |
| `addListMembers` | Add entities to an existing list | `POST /api/v1/lists/{id}/members` |
| `enrichList` | Bulk enrich a list with emails/phones (batched, max 50/request) | `GET /api/v1/lists/{id}` + `POST /api/v1/execute` |
| `exportList` | Export a list as flat JSON | `GET /api/v1/lists/{id}/export` |

**Frontend tools:** None currently defined. The route accepts client-sent tool schemas via `frontendTools()` but no frontend defines any.

---

## 5. How to Add a New Tool

1. **Define it** in `src/app/api/chat/route.ts` inside the `tools` object passed to `streamText()`:

```ts
newTool: tool({
  description: "What this tool does",
  inputSchema: z.object({
    param: z.string().describe("What this param is"),
  }),
  execute: async ({ param }) => {
    return dataEngineFetch("/v1/some-endpoint", { body: { param } });
  },
}),
```

2. **Add usage guidance** to the `SYSTEM_PROMPT` constant so Claude knows when to use it.

3. **No other files need to change.** No changes to chat-package, Cloud, or any other file.

---

## 6. What chat-package Owns

**Repo:** `github:bencrane/chat-package` (installed via GitHub)
**Version:** 2.0.0

The package is a thin wrapper (~43 lines of component code). It exports one thing:

```ts
import { ChatInterface } from "chat-package";
```

### ChatInterface component

- Initializes `AssistantCloud` client from `cloudBaseUrl` prop
- Creates runtime via `useChatRuntime({ cloud })`
- Renders `<AssistantRuntimeProvider>` wrapping:
  - `<ThreadList />` in a 220px sidebar (only when Cloud is configured)
  - `<Thread />` in the main area
- Falls back to `<Thread />` only if no `cloudBaseUrl` is provided (stateless mode)

### What chat-package does NOT do

- Does not define tools
- Does not define system prompts
- Does not make LLM calls
- Does not configure the Anthropic provider
- Does not hold API keys

---

## 7. Auth Gap (Known)

- Cloud is initialized with `anonymous: true` — no user/org/company identity flows to Cloud
- `dataEngineFetch()` uses a single `DATAENGINE_API_TOKEN`, not per-user tokens
- The `/api/chat` route does not receive or use the user's JWT
- There is no way for tools to know which org/company is making the request
- App-level auth exists (`src/lib/auth-context.tsx`) but is not connected to the chat system

---

## 8. Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_ASSISTANT_BASE_URL` | Client-side | assistant-ui Cloud URL (thread persistence) |
| `ANTHROPIC_API_KEY` | Server-side | LLM calls to Anthropic |
| `CHAT_MODEL` | Server-side | Model selection (default: `claude-sonnet-4-20250514`) |
| `DATAENGINE_API_TOKEN` | Server-side | Data Engine X Bearer auth |
| `NEXT_PUBLIC_API_BASE_URL` | Client-side | OEX backend URL |
| `NEXT_PUBLIC_DEX_API_BASE_URL` | Both | Data Engine X base URL (default: `https://api.dataengine.run`) |

All secrets managed via Doppler. No `.env` files in production.

---

## 9. File Map

### Active — in the message path

| File | Role |
|---|---|
| `src/app/(protected)/chat/page.tsx` | Chat page — renders `<ChatInterface>` with Cloud URL |
| `src/app/api/chat/route.ts` | LLM endpoint — system prompt, 10 tools, Anthropic streaming |
| `chat-package/src/components/ChatInterface.tsx` | UI wrapper — Cloud client, runtime, Thread + ThreadList |
| `chat-package/src/index.ts` | Package entry — exports `ChatInterface` |
| `chat-package/src/styles.css` | Theme + Tailwind + assistant-ui styles |

### Supporting — auth, providers, API clients

| File | Role |
|---|---|
| `src/lib/auth-context.tsx` | Auth provider — user/org state, tokens (not connected to chat) |
| `src/components/providers.tsx` | App providers — QueryClient, Auth, Company |
| `src/lib/api-client.ts` | OpenAPI fetch client for OEX API |
| `src/lib/api.ts` | Auth helpers, `apiFetch`, `dataEngineFetch` (client-side) |
| `src/app/api/dataengine/[...path]/route.ts` | Server proxy to Data Engine X (used by Explore/TAM, not chat) |

### Config

| File | Role |
|---|---|
| `package.json` | Dependencies: `@assistant-ui/*`, `ai`, `assistant-cloud`, `chat-package` |
| Doppler (external) | All secrets: `ANTHROPIC_API_KEY`, `DATAENGINE_API_TOKEN`, etc. |

---

## 10. Common Misconceptions

| Misconception | Reality |
|---|---|
| "Cloud handles LLM calls" | No. Cloud handles thread persistence only. LLM calls go to `/api/chat`. |
| "Tools are configured in Cloud dashboard" | No. Tools are defined in `route.ts`. Cloud has no role in tool execution. |
| "The system prompt is in Cloud" | No. It's the `SYSTEM_PROMPT` constant in `route.ts`. |
| "`/api/chat` is dead code" | No. It's the active LLM endpoint, hit on every message. |
| "Cloud calls Anthropic directly" | No. Your Next.js route calls Anthropic. Cloud calls nothing. |
| "`CLOUD-MIGRATION.md` describes our architecture" | Partially. That doc describes chat-package internals. The claim that Cloud handles LLM calls is incorrect for our setup — see the correction note added to that file. |

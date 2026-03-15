# D26: Wire up /api/chat with tools + system prompt

**Phase:** 2 of 3 (can run in parallel with D25)
**Repo:** `/Users/benjamincrane/outbound-engine-x-frontend/`
**Scope:** Only modify `src/app/api/chat/route.ts`. Do NOT touch chat-package, chat page, layout, or any other files.

---

## Context

The OEX frontend has a chat feature powered by assistant-ui + Vercel AI SDK v6. The chat page sends messages to `/api/chat`, which calls an LLM and streams the response back. assistant-ui Cloud handles thread persistence separately (the frontend handles that — not your concern).

The current `/api/chat/route.ts` is a bare-bones stub:

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: anthropic(process.env.CHAT_MODEL || "claude-sonnet-4-20250514"),
    messages: await convertToModelMessages(messages),
    maxSteps: 5 as any,
  });
  return result.toUIMessageStreamResponse();
}
```

It has no system prompt, no tools, and a type hack on `maxSteps`.

## Architecture Rules (do not violate)

- This route runs **server-side** in Next.js. It holds API keys and makes authenticated calls to external services.
- The browser NEVER sees `ANTHROPIC_API_KEY`, `DATAENGINE_API_TOKEN`, or any server-side secrets.
- Tools are defined and executed HERE, not in the browser, not in Cloud.
- `frontendTools(tools)` from `@assistant-ui/react-ai-sdk` converts tool schemas sent from the client into AI SDK format. The client may send tool schemas in the request body — merge them with your server-side tools.
- assistant-ui Cloud is NOT involved in this route at all. Do not import anything from `assistant-cloud`.

## Environment Variables Available

```
ANTHROPIC_API_KEY=sk-ant-api03-...      # Anthropic API key
CHAT_MODEL=claude-sonnet-4-20250514     # Model to use
DATAENGINE_API_TOKEN=6qNBCTS3rx...      # Data Engine X auth token
NEXT_PUBLIC_API_BASE_URL=https://api.outboundengine.dev  # OEX backend
```

Note: Data Engine X base URL is `https://api.dataengine.run`. This is NOT in an env var currently — you may hardcode it or add a `DATAENGINE_API_URL` env var.

## Tasks

### 1. Fix the `maxSteps` type issue

The current code uses `maxSteps: 5 as any`. Check whether `maxSteps` is a valid option on `streamText` in `ai@6.0.116`. Read the type definition at:
```
node_modules/ai/dist/index.d.ts
```

If `maxSteps` is valid, remove the `as any`. If it has been renamed or moved, use the correct option. If it doesn't exist in v6, remove it entirely.

### 2. Add a system prompt

Add a `system` parameter to `streamText()` that defines the assistant's role. The assistant is an AI sales assistant for Outbound Engine X — a multi-channel outbound sales platform. It helps users:

- Find and filter leads from their database
- Look up company and person details
- Understand campaign performance
- (Future: create campaigns, manage sequences)

Keep the system prompt concise and functional. Do not over-engineer it. Include instructions that the assistant should use the available tools to answer questions about leads and companies rather than making up data.

### 3. Accept frontend tool schemas

The request body may include `system` and `tools` fields sent by `AssistantChatTransport` from the client. Update the destructuring:

```ts
const { messages, system, tools } = await req.json();
```

Use `frontendTools` to convert client tool schemas, and merge with server-side tools:

```ts
import { frontendTools } from "@assistant-ui/react-ai-sdk";

tools: {
  ...frontendTools(tools ?? {}),
  // server-side tools below
},
```

If a `system` message comes from the client, you can prepend or append it to your server-defined system prompt, or ignore it. Your server-defined system prompt should take precedence.

### 4. Define server-side tools

Define these tools using the `tool` helper from `ai`:

```ts
import { tool } from "ai";
import { z } from "zod";
```

**Tool: `queryLeads`**
- Description: Search for leads matching filters (industry, title, seniority, company size, etc.)
- Calls: Data Engine proxy at `https://api.dataengine.run/api/v1/entities/persons`
  - Or use the local proxy: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dataengine/v1/entities/persons`
  - The local proxy adds the DATAENGINE_API_TOKEN automatically
- Auth: `Authorization: Bearer ${process.env.DATAENGINE_API_TOKEN}` (if calling Data Engine directly)
- Method: POST
- Parameters: industry (optional string), title (optional string), seniority (optional string), limit (optional number, default 25)
- Returns: The JSON response from the API

**Tool: `getCompany`**
- Description: Get details about a specific company by entity ID
- Calls: `https://api.dataengine.run/api/v1/entities/companies` or local proxy equivalent
- Auth: Same as above
- Method: POST (the Data Engine uses POST for queries)
- Parameters: entity_id (required string)
- Returns: The JSON response

**Tool: `getPerson`**
- Description: Get details about a specific person by entity ID
- Calls: `https://api.dataengine.run/api/v1/entities/persons` or local proxy equivalent
- Auth: Same as above
- Method: POST
- Parameters: entity_id (required string)
- Returns: The JSON response

**Important:** The exact Data Engine API request/response shapes should be verified. Read these files before defining tool parameters:
- `/Users/benjamincrane/outbound-engine-x-frontend/src/features/tam/api.ts` — shows how TAM feature calls Data Engine
- `/Users/benjamincrane/outbound-engine-x-frontend/src/app/api/dataengine/[...path]/route.ts` — the proxy route

Match the request format used by the existing TAM feature. Do not guess at field names.

### 5. Handle errors in tools

Each tool's `execute` function should:
- Try the fetch call
- If it fails, return a descriptive error message (not throw) so the LLM can tell the user what went wrong
- Never expose raw API keys or internal URLs in error messages returned to the LLM

## Files to Read Before Modifying

- `/Users/benjamincrane/outbound-engine-x-frontend/src/app/api/chat/route.ts` — current route (modify this)
- `/Users/benjamincrane/outbound-engine-x-frontend/src/features/tam/api.ts` — Data Engine API usage pattern
- `/Users/benjamincrane/outbound-engine-x-frontend/src/app/api/dataengine/[...path]/route.ts` — proxy route
- `/Users/benjamincrane/outbound-engine-x-frontend/src/lib/api.ts` — OEX API client pattern
- `/Users/benjamincrane/outbound-engine-x-frontend/node_modules/ai/dist/index.d.ts` — verify `maxSteps` and `streamText` types
- `/Users/benjamincrane/outbound-engine-x-frontend/.env.local` — available env vars

## Do NOT

- Modify any file other than `src/app/api/chat/route.ts` (and optionally `.env.local` if adding a new env var)
- Install new packages (`ai`, `zod`, `@ai-sdk/anthropic`, `@assistant-ui/react-ai-sdk` are already installed)
- Import from `assistant-cloud` — Cloud is not involved in this route
- Use `__internal_getAssistantOptions` or any `__internal` method
- Expose API keys in tool responses or error messages
- Start any dev servers
- Modify chat-package

## Success Criteria

1. `src/app/api/chat/route.ts` compiles without TypeScript errors (no `as any` hacks)
2. Route has a clear system prompt
3. Route accepts `messages`, `system`, and `tools` from request body
4. Route defines at least `queryLeads`, `getCompany`, `getPerson` server-side tools
5. Tools make authenticated calls to Data Engine X
6. Tool errors are caught and returned as descriptive strings, not thrown
7. `frontendTools` merges any client-sent tool schemas
# Chat Protocol Reference

> For building a standalone backend service compatible with the assistant-ui + AI SDK chat transport.
>
> Based on: `ai@^6.0.116`, `@assistant-ui/react-ai-sdk@^1.3.13`, `assistant-cloud@^0.1.21`, `@ai-sdk/anthropic@^3.0.58`

---

## 1. Request Format

### HTTP Method & Headers

```
POST /api/chat
Content-Type: application/json
User-Agent: ... ai-sdk/6.x.x ...
```

The `User-Agent` header includes an AI SDK version suffix appended by `AssistantChatTransport`. Your server does not need to validate it.

### Request Body

`AssistantChatTransport` (from `@assistant-ui/react-ai-sdk`) sends the following JSON body:

```jsonc
{
  // Required — the conversation history
  "messages": UIMessage[],

  // Required — how the request was triggered
  "trigger": "submit-message" | "regenerate-message",

  // Required — a stable identifier for the conversation
  "id": "string",

  // Optional — the message ID being regenerated (only when trigger is "regenerate-message")
  "messageId": "string | undefined",

  // Optional — client-defined tool schemas (see §4)
  "tools": {
    "toolName": {
      "description": "string",
      "parameters": { /* JSON Schema 7 */ }
    }
  },

  // Optional — system prompt override from runtime model context
  "system": "string | undefined",

  // Optional — model call settings from runtime model context
  "callSettings": "unknown",

  // Optional — arbitrary config from runtime model context
  "config": "unknown",

  // Optional — request metadata
  "metadata": "unknown",

  // Optional — custom body fields merged by the transport
  // (e.g., designer chat adds formatId, side, currentHtml, brandConfig)
  ...customBody
}
```

**In practice**, the current frontend sends:
- `messages` — always present
- `tools` — present but empty `{}` (no frontend tools are currently defined)
- `trigger`, `id` — always present
- `system`, `callSettings`, `config` — present but `undefined` (not configured in runtime)

The current `/api/chat` route destructures only `messages` and `tools`:

```ts
const { messages, tools: clientTools }: {
  messages: UIMessage[];
  tools?: Record<string, { description?: string; parameters: unknown }>;
} = await req.json();
```

Your service can safely ignore fields it doesn't use. The transport will always send the full shape.

### UIMessage Structure

Each message in the `messages` array follows the `UIMessage` type from the `ai` package:

```ts
interface UIMessage {
  id: string;
  role: "system" | "user" | "assistant";
  metadata?: unknown;
  parts: UIMessagePart[];
}
```

Where `UIMessagePart` is a union:

```ts
type UIMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string; providerMetadata?: ProviderMetadata }
  | { type: "tool-invocation"; toolInvocationId: string; toolName: string; args: unknown; state: string; result?: unknown }
  | { type: "source-url"; sourceId: string; url: string; title?: string }
  | { type: "source-document"; sourceId: string; mediaType: string; title: string }
  | { type: "file"; mediaType: string; url: string }
  | { type: "step-start" };
```

**Key detail:** Messages use `parts` (not a flat `content` string). For user messages, parts are typically `[{ type: "text", text: "..." }]`. For assistant messages, parts include text, tool invocations, reasoning, and step boundaries interleaved in order.

### Converting UIMessage to Model Messages

Before passing to an LLM, messages must be converted from the UI format to the provider's model message format:

```ts
import { convertToModelMessages } from "ai";

const modelMessages = await convertToModelMessages(messages);
```

This is a required step. `UIMessage[]` is a UI representation — the LLM provider expects a different shape. `convertToModelMessages` handles the translation, including flattening tool invocation parts into the tool call/result format the model expects.

---

## 2. Response Format (SSE Stream)

### HTTP Response

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Vercel-AI-UI-Message-Stream: v1
X-Accel-Buffering: no
```

The `X-Vercel-AI-UI-Message-Stream: v1` header identifies the protocol version. The client transport checks for this.

### Stream Format

The response body is a Server-Sent Events stream. Each event is a single `data:` line containing a JSON object, followed by two newlines:

```
data: {"type":"...","...":"..."}\n\n
```

The stream terminates with:

```
data: [DONE]\n\n
```

There are no named SSE events (no `event:` lines). All events use the default unnamed event type. Each `data:` line contains exactly one JSON-serialized `UIMessageChunk`.

### Event Types

Events are typed by a `type` field. Here is the complete set, grouped by category.

#### Lifecycle Events

```jsonc
// First event — opens the message
{ "type": "start", "messageId": "msg-xxx" }

// Marks the beginning of a step (each LLM turn is a step)
{ "type": "start-step" }

// Marks the end of a step
{ "type": "finish-step" }

// Final event before [DONE]
{ "type": "finish", "finishReason": "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" }

// Sent if the stream is aborted
{ "type": "abort", "reason": "string" }
```

`finishReason` values:
- `"stop"` — model finished naturally
- `"tool-calls"` — model wants to call tools (used between steps in multi-step flows)
- `"length"` — hit token limit
- `"content-filter"` — blocked by safety filter
- `"error"` — generation error

#### Text Events

```jsonc
{ "type": "text-start", "id": "text-1" }
{ "type": "text-delta", "id": "text-1", "delta": "Hello" }
{ "type": "text-delta", "id": "text-1", "delta": " world" }
{ "type": "text-end",   "id": "text-1" }
```

Text parts are identified by `id`. Multiple text parts can exist in a single message (separated by tool calls or step boundaries). The `delta` field contains the incremental text to append.

#### Reasoning Events

```jsonc
{ "type": "reasoning-start", "id": "reasoning-1" }
{ "type": "reasoning-delta", "id": "reasoning-1", "delta": "Let me think..." }
{ "type": "reasoning-end",   "id": "reasoning-1" }
```

Same pattern as text events but for model reasoning/thinking content (extended thinking, chain-of-thought).

#### Tool Call Events (Input)

```jsonc
// Tool call starts streaming
{ "type": "tool-input-start", "toolCallId": "call-abc", "toolName": "searchEntities" }

// Incremental JSON input (streamed as the model generates it)
{ "type": "tool-input-delta", "toolCallId": "call-abc", "inputTextDelta": "{\"search" }

// Full input is available (parsed JSON)
{
  "type": "tool-input-available",
  "toolCallId": "call-abc",
  "toolName": "searchEntities",
  "input": { "search_type": "companies", "criteria": { "industry": "dental" } }
}

// Input parsing failed
{
  "type": "tool-input-error",
  "toolCallId": "call-abc",
  "toolName": "searchEntities",
  "input": { /* raw input */ },
  "errorText": "Invalid JSON"
}
```

`tool-input-start` and `tool-input-delta` are optional — the stream may skip directly to `tool-input-available` if input is not streamed incrementally.

#### Tool Result Events (Output)

```jsonc
// Tool executed successfully
{
  "type": "tool-output-available",
  "toolCallId": "call-abc",
  "output": { /* arbitrary JSON — the return value of execute() */ }
}

// Tool execution failed
{
  "type": "tool-output-error",
  "toolCallId": "call-abc",
  "errorText": "Failed to reach Data Engine API."
}

// Tool execution was denied (approval flow)
{ "type": "tool-output-denied", "toolCallId": "call-abc" }
```

#### Source Events

```jsonc
{ "type": "source-url", "sourceId": "src-1", "url": "https://...", "title": "Page Title" }
{ "type": "source-document", "sourceId": "src-2", "mediaType": "application/pdf", "title": "Report" }
```

#### File Events

```jsonc
{ "type": "file", "url": "https://...", "mediaType": "image/png" }
```

#### Error Events

```jsonc
{ "type": "error", "errorText": "Something went wrong" }
```

#### Custom Data Events

```jsonc
{ "type": "data-myCustomType", "data": { /* arbitrary */ } }
```

Custom data events have a `type` field prefixed with `data-`. These are not currently used but are part of the protocol.

### Typical Stream Sequences

**Simple text response:**
```
data: {"type":"start","messageId":"msg-1"}
data: {"type":"start-step"}
data: {"type":"text-start","id":"text-1"}
data: {"type":"text-delta","id":"text-1","delta":"Here are"}
data: {"type":"text-delta","id":"text-1","delta":" the results."}
data: {"type":"text-end","id":"text-1"}
data: {"type":"finish-step"}
data: {"type":"finish","finishReason":"stop"}
data: [DONE]
```

**Tool call → tool result → follow-up text (multi-step):**
```
data: {"type":"start","messageId":"msg-2"}

// Step 1: Model decides to call a tool
data: {"type":"start-step"}
data: {"type":"tool-input-available","toolCallId":"call-1","toolName":"searchEntities","input":{"search_type":"companies","criteria":{"industry":"dental"},"limit":10}}
data: {"type":"tool-output-available","toolCallId":"call-1","output":{"results":[...],"total":42}}
data: {"type":"finish-step"}

// Step 2: Model processes tool result and responds
data: {"type":"start-step"}
data: {"type":"text-start","id":"text-1"}
data: {"type":"text-delta","id":"text-1","delta":"Found 42 dental practices."}
data: {"type":"text-end","id":"text-1"}
data: {"type":"finish-step"}

data: {"type":"finish","finishReason":"stop"}
data: [DONE]
```

### Generating the Stream

Using the `ai` package's `streamText()`:

```ts
import { streamText } from "ai";

const result = streamText({ model, system, messages, tools, stopWhen });
return result.toUIMessageStreamResponse();
```

`toUIMessageStreamResponse()` returns a standard `Response` object with the correct headers and a `ReadableStream` body that produces the SSE events above.

---

## 3. Tool Definition Pattern

> This section documents the per-tool format for protocol understanding. It does not prescribe how to organize tools — the current flat structure is specific to this codebase.

### tool() Signature

```ts
import { tool } from "ai";
import { z } from "zod";

const myTool = tool({
  description: "Human-readable description of what this tool does",
  inputSchema: z.object({
    param1: z.string().describe("What this parameter is"),
    param2: z.number().optional().default(10).describe("Optional with default"),
  }),
  execute: async (input) => {
    // input is fully typed from the Zod schema
    // Return value becomes the tool-output-available payload
    return { result: "data" };
  },
});
```

**Fields:**
- `description` — sent to the LLM as the tool's purpose. The model uses this to decide when to call the tool.
- `inputSchema` — a Zod schema that defines the tool's parameters. Converted to JSON Schema when sent to the model. Also used for runtime validation of model-generated input.
- `execute` — async function that runs server-side when the model calls the tool. Receives the validated input. Return value is serialized as JSON and sent back to the model (and streamed to the client as `tool-output-available`).

### Representative Example: searchEntities

```ts
searchEntities: tool({
  description:
    "Search for companies or people matching criteria. Supports filtering by industry, "
    + "seniority, department, job title, location, company domain, company name, employee "
    + "range, and free-text query. Set search_type to 'companies' or 'people'.",
  inputSchema: z.object({
    search_type: z
      .enum(["companies", "people"])
      .describe("Whether to search for companies or people"),
    criteria: z
      .record(z.string(), z.union([z.string(), z.array(z.string())]))
      .describe(
        "Search filters. Valid keys: seniority, department, industry, employee_range, "
        + "company_type, continent, country_code, query, company_domain, company_name, "
        + "company_linkedin_url, job_title, location."
      ),
    provider: z
      .string()
      .optional()
      .describe("Force a specific provider: 'prospeo' or 'blitzapi'. Omit to auto-select."),
    limit: z
      .number()
      .optional()
      .default(25)
      .describe("Max results per page (1-100)"),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number for pagination"),
  }),
  execute: async (params) => {
    return dataEngineFetch("/v1/search", { body: params });
  },
}),
```

### Representative Example: enrichList

```ts
enrichList: tool({
  description:
    "Enrich companies in a list with additional data (emails, phone numbers, firmographics). "
    + "First retrieves the list members, then sends them to the bulk enrichment pipeline.",
  inputSchema: z.object({
    list_id: z
      .string()
      .describe("The ID of the list to enrich"),
    operation: z
      .enum(["company.enrich.bulk_prospeo", "company.enrich.bulk_profile"])
      .optional()
      .default("company.enrich.bulk_profile")
      .describe(
        "Enrichment operation. 'company.enrich.bulk_profile' uses multi-provider waterfall "
        + "(recommended). 'company.enrich.bulk_prospeo' uses Prospeo only."
      ),
  }),
  execute: async ({ list_id, operation }) => {
    // Multi-step: fetch list, then batch-enrich
    const listResult = await dataEngineFetch(`/v1/lists/${list_id}`, { method: "GET" });
    if (listResult.error) return listResult;
    if (!listResult.members?.length) return { error: "List has no members to enrich." };

    const companies = listResult.members.map(extractCompanyFields);
    const batchSize = 50;
    const results = [];

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      results.push(
        await dataEngineFetch("/v1/execute", {
          body: { operation_id: operation, entity_type: "company", input: { companies: batch } },
        })
      );
    }

    return { list_id, total_companies: companies.length, batches: results.length, results };
  },
}),
```

### How Tools Flow Through the Protocol

1. **Registration:** Tools are passed to `streamText({ tools: { ... } })`. The AI SDK converts each tool's `inputSchema` (Zod) to JSON Schema and sends it to the LLM provider.
2. **Model invocation:** The LLM generates a tool call with a `toolCallId`, `toolName`, and JSON `input`.
3. **Validation:** The AI SDK validates the input against the Zod schema.
4. **Execution:** If valid, `execute()` is called server-side. The return value is captured.
5. **Streaming:** The following events are emitted in order:
   - `tool-input-start` → `tool-input-delta` (optional) → `tool-input-available`
   - `tool-output-available` (on success) or `tool-output-error` (on failure)
6. **Multi-step:** If `stopWhen` allows it, the model sees the tool result and generates the next step (text response, another tool call, etc.).

---

## 4. Frontend Tool Merging

### How frontendTools() Works

```ts
import { frontendTools } from "@assistant-ui/react-ai-sdk";
```

`frontendTools()` takes client-defined tool schemas (sent in the request body's `tools` field) and wraps them for the AI SDK:

```ts
// Implementation (simplified)
const frontendTools = (
  tools: Record<string, { description?: string; parameters: JSONSchema7 }>
) =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        inputSchema: jsonSchema(tool.parameters),
      },
    ])
  );
```

**Input:** A record of `{ description?, parameters: JSONSchema7 }` — the raw `tools` field from the request body.

**Output:** A record of `{ description?, inputSchema: Schema }` — compatible with the `tool()` format, except **without an `execute` function**.

Tools without `execute` are treated as **client-executed tools**. When the model calls one:
- The server streams `tool-input-available` to the client
- The server does NOT execute anything — there is no `execute` function
- The client is responsible for executing the tool and sending the result back (via a follow-up request with the tool result in the message history)

### How Merging Works in streamText()

```ts
const result = streamText({
  tools: {
    ...frontendTools(clientTools ?? {}),  // Client-defined (no execute)
    searchEntities: tool({ ... }),         // Server-defined (has execute)
    enrichList: tool({ ... }),             // Server-defined (has execute)
  },
});
```

The spread merges both sets into a single tool registry. The LLM sees all tools (both server and client) and can call any of them. The AI SDK dispatches based on whether `execute` is present:

- **Has `execute`** → run server-side, stream result immediately
- **No `execute`** → stream the tool call to the client, wait for client to provide result

### Current State

No frontend tools are currently defined. The `tools` field in requests is empty `{}`. The `frontendTools()` call is a no-op but maintains the protocol contract for future use.

### AssistantChatTransport Tool Conversion

On the client side, `AssistantChatTransport` converts runtime tool definitions to JSON Schema before sending:

```ts
import { toToolsJSONSchema } from "assistant-stream";

// Filters out disabled tools and backend-only tools
// Converts parameters to JSONSchema7
const tools = toToolsJSONSchema(context?.tools ?? {});
```

This means client-defined tools are:
1. Defined in the frontend runtime (via `makeAssistantTool()` or similar)
2. Converted to `{ description, parameters: JSONSchema7 }` by the transport
3. Sent in the request body
4. Wrapped by `frontendTools()` on the server
5. Passed to `streamText()` without `execute`

---

## 5. Streaming Configuration

### streamText() Call

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, stepCountIs } from "ai";

const result = streamText({
  // Model — Anthropic Claude via AI SDK provider
  model: anthropic(process.env.CHAT_MODEL || "claude-sonnet-4-20250514"),

  // System prompt — injected as the first system message
  system: SYSTEM_PROMPT,

  // Messages — converted from UIMessage[] to model format
  messages: await convertToModelMessages(messages),

  // Step limiting — stops after 5 LLM turns (prevents infinite tool loops)
  stopWhen: stepCountIs(5),

  // Tools — server + frontend merged
  tools: { ...frontendTools(clientTools), ...serverTools },
});
```

### Configuration Details

**Model selection:**
- Provider: `@ai-sdk/anthropic` — wraps the Anthropic API
- Model ID: configurable via `CHAT_MODEL` env var, defaults to `claude-sonnet-4-20250514`
- The `anthropic()` function creates a model instance that handles Anthropic-specific message formatting, tool use protocol, and streaming

**System prompt:**
- Passed as the `system` parameter to `streamText()`
- Sent as the system message to the LLM (not visible in the message stream)
- Can be any string — the current implementation uses a ~100-line prompt with tool routing guidance, response style rules, and credit/confirmation policies

**Step limiting:**
- `stopWhen: stepCountIs(5)` — the stream will complete after 5 steps maximum
- A "step" is one LLM generation turn. Tool calls consume a step (model generates tool call), and the follow-up response consumes another step.
- Without this, a model could loop indefinitely calling tools. The limit is a safety bound.
- The designer chat variant uses `stepCountIs(3)` since it doesn't use tools.

**Message conversion:**
- `convertToModelMessages(messages)` is async — it resolves file URLs and converts the `UIMessage[]` parts format into the flat message format the model provider expects
- This handles converting tool invocation parts back into the tool_use/tool_result message pairs the model expects

### What the Server Returns

```ts
return result.toUIMessageStreamResponse();
```

This returns a standard `Response` with:
- Status: `200`
- Headers: as documented in §2
- Body: `ReadableStream` producing SSE events

The entire response is a single HTTP response with a streaming body. There is no chunked transfer encoding negotiation needed — SSE handles framing.

---

## 6. assistant-ui Cloud Interaction

### Architecture Boundary

Cloud and the chat endpoint are **fully independent paths**. They do not communicate with each other.

```
Browser
  ├── Thread CRUD ──────→ assistant-ui Cloud API
  │     (list, create, get, rename, archive, delete threads)
  │     (message history persistence)
  │     (thread title auto-generation)
  │
  └── Chat messages ────→ POST /api/chat (your backend)
        (LLM calls, tool execution, streaming)
```

### What Cloud Does

Cloud is initialized client-side:

```ts
const cloud = new AssistantCloud({
  baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL,
  anonymous: true,
});
```

The `useChatRuntime({ cloud })` hook passes Cloud to `useCloudThreadListAdapter()`, which handles:

| Capability | Cloud API Method |
|---|---|
| List threads | `cloud.threads.list()` |
| Create thread | `cloud.threads.create()` |
| Get thread | `cloud.threads.get(threadId)` |
| Rename thread | `cloud.threads.update(threadId, { title })` |
| Archive thread | `cloud.threads.update(threadId, { is_archived })` |
| Delete thread | `cloud.threads.delete(threadId)` |
| Auto-generate title | `cloud.runs.stream({ assistant_id: "system/thread_title" })` |
| Persist messages | `AssistantCloudThreadHistoryAdapter` |

### What Cloud Does NOT Do

- Cloud does **not** send requests to `/api/chat`
- Cloud does **not** receive data from `/api/chat`
- Cloud does **not** make LLM calls
- Cloud does **not** execute tools
- Cloud does **not** hold the system prompt or tool definitions
- Cloud does **not** proxy, intercept, or participate in chat message flow

### Telemetry (Passive)

Cloud has a telemetry subsystem that can track tool execution metadata after the fact:

```ts
// Cloud's telemetry schema includes:
{
  tool_source: "mcp" | "frontend" | "backend",
  // ... other metadata
}
```

This is observability only — it records what happened, it doesn't orchestrate anything.

### Implications for a Standalone Backend

Your standalone backend does not need to know about Cloud at all. Cloud is a client-side concern:

- The frontend manages Cloud for thread persistence
- The frontend sends chat messages to your backend endpoint
- These are two separate, parallel communication paths
- Your backend receives `UIMessage[]`, returns an SSE stream — Cloud is not in the loop

---

## 7. Designer Chat Variant

The designer chat is a second chat flow that runs alongside the primary one, demonstrating how multiple workflows coexist.

### Transport Configuration

The designer chat uses an explicit `AssistantChatTransport` with a custom endpoint and body:

```ts
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";

const transport = new AssistantChatTransport({
  api: "/api/chat/designer",
  body: () => ({
    formatId: contextRef.current.activeFormat.id,
    side: contextRef.current.activeSide,
    currentHtml: contextRef.current.currentHtml,
    brandConfig: contextRef.current.brandConfig,
  }),
});

const runtime = useChatRuntime({ transport });
```

**Key differences from the main chat:**

| Aspect | Main Chat | Designer Chat |
|---|---|---|
| Endpoint | `/api/chat` (default) | `/api/chat/designer` (explicit) |
| Cloud | Yes (thread persistence) | No (stateless) |
| Runtime init | `useChatRuntime({ cloud })` | `useChatRuntime({ transport })` |
| Custom body fields | None | `formatId`, `side`, `currentHtml`, `brandConfig` |
| Server-side tools | 15+ tools (Data Engine X) | None |
| Frontend tools | None (passthrough) | None |
| Step limit | `stepCountIs(5)` | `stepCountIs(3)` |
| System prompt | Static (tool routing + response style) | Dynamic (built from format, surface, brand config) |

### Designer Route Handler

```ts
// src/app/api/chat/designer/route.ts
export async function POST(req: Request) {
  const { messages, formatId, side, currentHtml, brandConfig } = await req.json();

  const system = buildSystemPrompt({ formatId, side, currentHtml, brandConfig });

  const result = streamText({
    model: anthropic(process.env.CHAT_MODEL || "claude-sonnet-4-20250514"),
    system,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
    // No tools — designer chat is text-only
  });

  return result.toUIMessageStreamResponse();
}
```

The designer route:
- Accepts additional body fields (`formatId`, `side`, `currentHtml`, `brandConfig`) merged by the transport's `body` function
- Builds a dynamic system prompt from the format/surface configuration
- Uses the same `streamText()` → `toUIMessageStreamResponse()` protocol
- Returns the same SSE stream format — the client transport handles it identically

### Custom Body Pattern

The `body` option on `AssistantChatTransport` is a function that returns additional fields merged into the request body:

```ts
new AssistantChatTransport({
  api: "/api/chat/designer",
  body: () => ({
    // These fields are merged alongside messages, tools, trigger, etc.
    formatId: "postcard-4x6",
    side: "front",
    currentHtml: "<div>...</div>",
    brandConfig: { primaryColor: "#1a1a2e", ... },
  }),
});
```

This is how workflow-specific context is passed to the server without modifying the base protocol. Your standalone backend can use this pattern to receive workflow identifiers, configuration, or context that drives dynamic behavior (like loading different tool modules).

---

## Appendix A: Package Versions

These are the versions this document was written against:

| Package | Version |
|---|---|
| `ai` | `^6.0.116` |
| `@ai-sdk/anthropic` | `^3.0.58` |
| `@ai-sdk/react` | `^3.0.118` |
| `@assistant-ui/react` | `^0.12.17` |
| `@assistant-ui/react-ai-sdk` | `^1.3.13` |
| `@assistant-ui/react-ui` | `^0.2.1` |
| `assistant-cloud` | `^0.1.21` |
| `zod` | `^4.3.6` |

## Appendix B: Implementing a Compatible Endpoint

A minimal compatible endpoint needs to:

1. **Accept** a `POST` request with `Content-Type: application/json`
2. **Parse** `messages` (as `UIMessage[]`) and optionally `tools` from the body
3. **Convert** messages via `convertToModelMessages()` (from the `ai` package)
4. **Call** `streamText()` with model, system prompt, converted messages, tools, and stop condition
5. **Return** `result.toUIMessageStreamResponse()`

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";

export async function handleChat(req: Request): Promise<Response> {
  const { messages, tools: clientTools } = await req.json() as {
    messages: UIMessage[];
    tools?: Record<string, { description?: string; parameters: unknown }>;
  };

  const result = streamText({
    model: anthropic(process.env.CHAT_MODEL || "claude-sonnet-4-20250514"),
    system: "Your system prompt here",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      ...frontendTools((clientTools ?? {}) as Parameters<typeof frontendTools>[0]),
      // Your tools here — loaded dynamically per workflow/platform
    },
  });

  return result.toUIMessageStreamResponse();
}
```

This produces a fully compatible response. The client transport will parse and render it identically.

If you use a different LLM provider, swap `anthropic()` for any AI SDK-compatible provider (OpenAI, Google, Mistral, etc.). The stream protocol is provider-agnostic — `toUIMessageStreamResponse()` normalizes the output.

If you use a different runtime (not Next.js), the handler signature changes but the core is the same: parse the request, call `streamText()`, return the response. The `ai` package works in any JavaScript runtime (Node.js, Bun, Deno, Cloudflare Workers).

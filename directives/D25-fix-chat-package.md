# D25: Fix chat-package

**Phase:** 1 of 3 (can run in parallel with D26)
**Repo:** `/Users/benjamincrane/chat-package/`
**Scope:** Only modify files in the chat-package repo. Do NOT touch the OEX frontend.

---

## Context

chat-package is a shared React component library installed via GitHub into multiple frontends. It exports a `ChatInterface` component that wraps assistant-ui's Thread + ThreadList with Cloud persistence.

**Current state:**
- Component exists at `src/components/ChatInterface.tsx` — structurally correct
- Only renders `<Thread />` — no `<ThreadList />` for conversation history
- CSS build is broken — `dist/index.css` does not exist (Tailwind CLI step fails silently)
- The `api` prop is passed to `useChatRuntime({ cloud, api })` but `api` is not a valid option on `UseChatRuntimeOptions` in AI SDK v6. It is silently ignored. The default transport (`AssistantChatTransport`) already defaults to `/api/chat`. To customize the API URL, you must pass a `transport` option instead.
- Build outputs that DO exist: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`

## Architecture Rules (do not violate)

- assistant-ui Cloud is a **persistence and telemetry layer only**. It does NOT make LLM calls.
- The consuming app (not this package) owns the `/api/chat` route, LLM provider config, and tool definitions.
- This package exports UI components and a runtime provider. Nothing else.
- `useChatRuntime({ cloud })` from `@assistant-ui/react-ai-sdk` is the correct hook.
- `AssistantCloud` is imported from `assistant-cloud` (or re-exported from `@assistant-ui/react`).
- `Thread` and `ThreadList` are imported from `@assistant-ui/react-ui`.
- Do NOT use `__internal_getAssistantOptions`. Do NOT use `useVercelUseChatRuntime`. Do NOT import from `@assistant-ui/cloud-ai-sdk`.

## Tasks

### 1. Fix the `api` prop

The current `api` prop is silently ignored because `useChatRuntime` in AI SDK v6 uses `transport`, not `api`.

**Two options (pick the simpler one):**

**Option A — Remove `api` prop entirely.** The default `AssistantChatTransport` already posts to `/api/chat`. Since every consuming app uses that default path, there's no need for it.

**Option B — Make `api` actually work** by constructing an `AssistantChatTransport` with the custom URL:

```tsx
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";

const transport = api !== "/api/chat"
  ? new AssistantChatTransport({ api })
  : undefined;

const runtime = useChatRuntime({ cloud, transport });
```

Verify that `AssistantChatTransport` is exported from `@assistant-ui/react-ai-sdk` before using Option B. If it is not exported, use Option A.

### 2. Add ThreadList to the layout

The component currently only renders `<Thread />`. Add `<ThreadList />` in a sidebar layout so users can see and switch between conversations.

Import `ThreadList` from `@assistant-ui/react-ui` (same place `Thread` comes from).

Layout should be a two-column grid:
- Left: `<ThreadList />` (fixed width, ~200-250px)
- Right: `<Thread />` (fills remaining space)

Both must be inside `<AssistantRuntimeProvider>`. The ThreadList only works when Cloud is configured — when `cloud` is undefined, either hide the ThreadList or show just the Thread full-width.

### 3. Fix the CSS build

The build script is:
```bash
tsup && tsc --emitDeclarationOnly --outDir dist && npx @tailwindcss/cli -i ./src/styles.css -o ./dist/index.css
```

`dist/index.css` does not exist. Debug why:

1. Run the Tailwind CLI step in isolation:
   ```bash
   cd /Users/benjamincrane/chat-package && npx @tailwindcss/cli -i ./src/styles.css -o ./dist/index.css
   ```
2. If it errors, read the error and fix it. Common issues:
   - `@config` directive in `src/styles.css` may not be supported by Tailwind v4 CLI
   - The `tailwind.config.ts` uses `satisfies Config` which requires TypeScript — Tailwind CLI may not handle `.ts` configs
   - Missing PostCSS or autoprefixer setup
3. Once the CSS generates successfully, verify it contains the assistant-ui styles and the CSS custom properties from `styles.css`.

### 4. Verify full build

Run the complete build:
```bash
cd /Users/benjamincrane/chat-package && npm run build
```

Verify ALL outputs exist:
- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (TypeScript declarations)
- `dist/index.css` (compiled styles)

### 5. Commit and push

Commit all changes with a descriptive message. Push to the `main` branch on GitHub so OEX can pull the update.

## Files to read before modifying

- `/Users/benjamincrane/chat-package/src/components/ChatInterface.tsx` — the component
- `/Users/benjamincrane/chat-package/src/styles.css` — the stylesheet
- `/Users/benjamincrane/chat-package/src/index.ts` — the export barrel
- `/Users/benjamincrane/chat-package/package.json` — build scripts and deps
- `/Users/benjamincrane/chat-package/tsup.config.ts` — bundler config
- `/Users/benjamincrane/chat-package/tailwind.config.ts` — Tailwind config

## Do NOT

- Install new packages (all deps are already present)
- Modify the OEX frontend repo
- Add a `/api/chat` route handler (the consuming app owns this)
- Add LLM provider configuration
- Add tool definitions
- Use `__internal_getAssistantOptions` or any method prefixed with `__internal`
- Import from `@assistant-ui/cloud-ai-sdk`
- Speculate about how Cloud works — refer only to actual source code

## Success Criteria

1. `npm run build` completes without errors
2. `dist/index.css` exists and contains CSS custom properties + assistant-ui styles
3. `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts` all exist
4. `ChatInterface` renders Thread + ThreadList when `cloudBaseUrl` is provided
5. `ChatInterface` renders Thread only (full width) when `cloudBaseUrl` is not provided
6. The `api` prop either works correctly via transport or is removed
7. All changes are committed and pushed to GitHub
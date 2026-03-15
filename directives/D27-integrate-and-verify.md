# D27: Integrate and Verify

**Phase:** 3 of 3 (run AFTER D25 and D26 are both complete)
**Repo:** `/Users/benjamincrane/outbound-engine-x-frontend/`
**Scope:** Pull updated chat-package, verify everything works end-to-end, clean up junk files, commit.

---

## Context

After D25 and D26:
- **chat-package** (D25) should now export a `ChatInterface` with Thread + ThreadList, with a working CSS build, pushed to GitHub
- **`/api/chat` route** (D26) should now have a system prompt, server-side tools (queryLeads, getCompany, getPerson), and proper `frontendTools` merging

This directive integrates both and verifies the full stack works.

## Prerequisites

Before starting, verify:
1. D25 is done: `chat-package` has been pushed to GitHub with all build outputs
2. D26 is done: `src/app/api/chat/route.ts` has tools and system prompt, compiles clean

If either is not done, stop and report what's missing.

## Tasks

### 1. Update chat-package dependency

```bash
cd /Users/benjamincrane/outbound-engine-x-frontend
npm update chat-package
```

Verify the updated package is pulled:
```bash
ls node_modules/chat-package/dist/
```

Expected files: `index.js`, `index.mjs`, `index.d.ts`, `index.css`

If `index.css` is missing, the D25 CSS fix did not land. Stop and report.

### 2. Verify chat page imports

Read `src/app/(protected)/chat/page.tsx`. It should import `ChatInterface` from `chat-package` and pass `cloudBaseUrl`. Current code:

```tsx
import { ChatInterface } from "chat-package";

export default function ChatPage() {
  return (
    <div className="flex-1 h-full w-full overflow-hidden">
      <ChatInterface cloudBaseUrl={process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!} />
    </div>
  );
}
```

If D25 removed the `api` prop, this is fine (default is `/api/chat`).
If D25 kept the `api` prop with transport-based implementation, this is also fine.

Check whether the chat page needs layout adjustments now that ThreadList is included in ChatInterface. The ThreadList adds a sidebar, so the page container may need to be full-height. Adjust if needed.

### 3. Verify CSS import in layout

Read `src/app/layout.tsx`. It should import chat-package styles:
```tsx
import "chat-package/index.css";
```

If this import exists, good. If it's missing, add it.

### 4. Verify the `/api/chat` route compiles

```bash
cd /Users/benjamincrane/outbound-engine-x-frontend
npx tsc --noEmit
```

Fix any TypeScript errors. Common issues:
- Missing `zod` dependency (should be installed already — check `node_modules/zod`)
- Type mismatches in tool definitions
- Import path issues

### 5. Start dev server and test

```bash
cd /Users/benjamincrane/outbound-engine-x-frontend
npm run dev
```

Open the chat page in a browser (typically `http://localhost:3000/chat`).

**Test 1 — Basic message:**
- Type "Hello" and send
- Expect: LLM responds with a greeting. Message appears in the Thread.

**Test 2 — Thread persistence (if Cloud is working):**
- Send a message, then refresh the page
- Expect: The conversation reappears (loaded from Cloud)
- Expect: ThreadList sidebar shows the conversation with an auto-generated title

**Test 3 — Tool usage:**
- Type "Find me some leads in the technology industry"
- Expect: The assistant calls the `queryLeads` tool, waits for results, then summarizes the leads

**Test 4 — Error handling:**
- If Data Engine is unreachable, the tool should return an error message and the LLM should relay it gracefully

If any test fails, diagnose the issue. Check:
- Browser console for client-side errors
- Terminal (dev server output) for server-side errors
- Network tab for failed requests

### 6. Clean up junk files

Delete these files/directories that are no longer needed:

```bash
rm -rf /Users/benjamincrane/outbound-engine-x-frontend/cloud-template-test/
rm /Users/benjamincrane/outbound-engine-x-frontend/cloud-reality-check.md
rm /Users/benjamincrane/outbound-engine-x-frontend/cloud-reality-check-verified.md
```

Do NOT delete:
- `directives/` — keep for reference
- Any file in `src/`

### 7. Commit all changes

Stage and commit everything in the OEX frontend:
- Updated `package-lock.json` (from chat-package update)
- Updated `package.json` (if changed)
- Updated/new files in `src/app/api/chat/route.ts`
- Updated `src/app/(protected)/chat/page.tsx` (if changed)
- Updated `src/app/layout.tsx` (if changed)
- Removed junk files

Commit message should follow the existing pattern: `feat: chat with AI tools + Cloud thread persistence (D27)`

Do NOT push unless explicitly asked.

## Files to Read Before Modifying

- `/Users/benjamincrane/outbound-engine-x-frontend/src/app/(protected)/chat/page.tsx`
- `/Users/benjamincrane/outbound-engine-x-frontend/src/app/layout.tsx`
- `/Users/benjamincrane/outbound-engine-x-frontend/src/app/api/chat/route.ts`
- `/Users/benjamincrane/outbound-engine-x-frontend/package.json`
- `/Users/benjamincrane/outbound-engine-x-frontend/node_modules/chat-package/dist/` (verify build outputs)

## Do NOT

- Modify chat-package (that's D25's job)
- Rewrite the `/api/chat` route from scratch (that's D26's job — only fix integration issues)
- Install new packages unless absolutely required for a fix
- Use `__internal_getAssistantOptions` or any `__internal` method
- Import from `assistant-cloud` in any page component (Cloud is handled inside chat-package)
- Delete the `directives/` directory

## Success Criteria

1. `npm run dev` starts without errors
2. Chat page renders Thread + ThreadList (or Thread-only if no Cloud URL)
3. Sending a message gets an LLM response streamed back
4. Tools execute when the LLM decides to use them (e.g., "find leads in tech")
5. Thread persistence works — refresh page, conversation reloads from Cloud
6. ThreadList shows conversation history with titles
7. No TypeScript errors (`npx tsc --noEmit` passes)
8. Junk files are deleted
9. All changes committed cleanly
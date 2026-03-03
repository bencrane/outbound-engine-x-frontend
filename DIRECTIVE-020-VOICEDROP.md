# Directive #20: VoiceDrop (Ringless Voicemail)

## Context

This is a Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 frontend. The backend has added **VoiceDrop** — ringless voicemail that delivers a voicemail directly to a prospect's phone without ringing. Two modes: AI voice (text-to-speech from a cloned voice) or static audio (pre-recorded file).

This directive creates the entire VoiceDrop feature from scratch: new feature module, new sidebar nav item, new permissions, and a full management UI for voice clones, sender numbers, DNC list, one-off voicemail sends, and campaign reports.

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/voicemail/send` | Send a voicemail (one-off) |
| `GET` | `/api/voicemail/voice-clones` | List all voice clones |
| `POST` | `/api/voicemail/voice-clones` | Create a voice clone |
| `DELETE` | `/api/voicemail/voice-clones/{voice_clone_id}` | Delete a voice clone |
| `POST` | `/api/voicemail/voice-clones/{voice_clone_id}/preview` | Preview a clone with test script |
| `GET` | `/api/voicemail/sender-numbers` | List verified sender numbers |
| `POST` | `/api/voicemail/sender-numbers/verify` | Start phone number verification |
| `POST` | `/api/voicemail/sender-numbers/verify-code` | Complete verification with code |
| `POST` | `/api/voicemail/dnc` | Add phone to Do Not Call list |
| `GET` | `/api/voicemail/campaigns/{campaign_id}/reports` | Export delivered RVMs (returns CSV URL) |

### Schemas (from API reference)

**Send Voicemail** (AI voice):
```json
{
  "company_id": "69a9ffab-...",
  "to": "7865551234",
  "from_number": "7865550001",
  "voice_clone_id": "L55l0kg8...",
  "script": "Hi {{first_name}}, this is a quick message about..."
}
```

**Send Voicemail** (static audio):
```json
{
  "company_id": "69a9ffab-...",
  "to": "7865551234",
  "from_number": "7865550001",
  "recording_url": "https://example.com/audio.mp3"
}
```

**Create Voice Clone**: `{ "display_name": "...", "recording_url": "..." }`

**Preview Voice Clone**: `{ "script": "Test script text..." }` → returns audio preview

**Start Verification**: `{ "phone_number": "...", "method": "sms" }`

**Complete Verification**: `{ "phone_number": "...", "code": "..." }`

**DNC**: `{ "phone": "..." }`

---

## Step 1: RBAC Updates

Add to `src/lib/permissions.ts`:

New permissions:
- `"voicedrop.view"` — view voicedrop page and configuration
- `"voicedrop.manage"` — send voicemails, manage clones/numbers/DNC

Grant to roles:
- `org_admin`: both `voicedrop.view` and `voicedrop.manage`
- `company_admin`: `voicedrop.view` only
- `company_member`: neither

### Add Sidebar Nav Item

Add to `src/components/sidebar.tsx`:

New nav item between Direct Mail and Settings:
```typescript
{ name: "VoiceDrop", href: "/voicedrop", icon: Phone, permission: "voicedrop.view" }
```
Import `Phone` from `lucide-react`.

---

## Step 2: Feature Module

Create `src/features/voicemail/`:
```
src/features/voicemail/
├── api.ts
└── components/
    ├── voice-clones-tab.tsx
    ├── sender-numbers-tab.tsx
    ├── send-voicemail-tab.tsx
    ├── dnc-tab.tsx
    └── campaign-reports-tab.tsx
```

---

## Step 3: API Hooks

Create `src/features/voicemail/api.ts`:

### `useSendVoicemail()`
```
POST /api/voicemail/send
Body: { company_id, to, from_number, voice_clone_id?, script?, recording_url? }
```
Mutation. Either `voice_clone_id + script` (AI voice) OR `recording_url` (static audio) must be provided.

### `useVoiceClones()`
```
GET /api/voicemail/voice-clones
Returns: untyped (array of voice clone objects, typically { id, display_name, recording_url, status, created_at })
```
Query key: `["voicemail", "voice-clones"]`

### `useCreateVoiceClone()`
```
POST /api/voicemail/voice-clones
Body: { display_name: string, recording_url: string }
```
Mutation. Invalidates `["voicemail", "voice-clones"]`.

### `useDeleteVoiceClone()`
```
DELETE /api/voicemail/voice-clones/{voice_clone_id}
```
Mutation. Invalidates `["voicemail", "voice-clones"]`.

### `usePreviewVoiceClone()`
```
POST /api/voicemail/voice-clones/{voice_clone_id}/preview
Body: { script: string }
Returns: untyped (audio preview data or URL)
```
Mutation (triggers generation).

### `useSenderNumbers()`
```
GET /api/voicemail/sender-numbers
Returns: untyped (array of { phone_number, status, verified_at, ... })
```
Query key: `["voicemail", "sender-numbers"]`

### `useStartVerification()`
```
POST /api/voicemail/sender-numbers/verify
Body: { phone_number: string, method: "sms" }
```
Mutation. Kicks off the SMS verification flow.

### `useCompleteVerification()`
```
POST /api/voicemail/sender-numbers/verify-code
Body: { phone_number: string, code: string }
```
Mutation. Invalidates `["voicemail", "sender-numbers"]` on success.

### `useAddToDnc()`
```
POST /api/voicemail/dnc
Body: { phone: string }
```
Mutation.

### `useCampaignVoicemailReport(campaignId)`
```
GET /api/voicemail/campaigns/{campaign_id}/reports
Returns: untyped (CSV download URL or report data)
```
Query key: `["voicemail", "reports", campaignId]`

---

## Step 4: Page + Route

Create `src/app/(protected)/voicedrop/page.tsx`.

Wrap with `<RouteGuard permission="voicedrop.view">`.

### Page Layout

```
┌──────────────────────────────────────────────────────────┐
│ VoiceDrop                                                │
│ Ringless voicemail — deliver voicemails without ringing   │
│                                                          │
│ [Send] [Voice Clones] [Sender Numbers] [DNC] [Reports]  │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ (tab content)                                        │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Use the `Tabs` component with 5 tabs.

---

## Step 5: Tab Components

### Tab 1: Send Voicemail (`send-voicemail-tab.tsx`)

The primary action tab for sending one-off voicemails. Gated behind `voicedrop.manage`.

```
┌──────────────────────────────────────────────────────────┐
│ Send Voicemail                                           │
│                                                          │
│ Mode: (●) AI Voice  ( ) Recording                        │
│                                                          │
│ Company:    [Nexus Labs ▾]                               │
│ To (phone): [_______________]                            │
│ From:       [7865550001 ▾]  (from verified sender numbers│
│                                                          │
│ ┌── AI Voice Mode ───────────────────────────────────┐   │
│ │ Voice Clone: [Alice - Sales Voice ▾]               │   │
│ │ Script:      [________________________________]    │   │
│ │              [________________________________]    │   │
│ │              [________________________________]    │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ OR                                                       │
│                                                          │
│ ┌── Recording Mode ──────────────────────────────────┐   │
│ │ Recording URL: [________________________________]  │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│                                    [Send Voicemail]      │
└──────────────────────────────────────────────────────────┘
```

**Mode toggle**: Two radio-style buttons (AI Voice / Recording). Determines which fields are shown.

**Company**: `Select` from company context (use `useCompanyContext`). For org_admin, show dropdown. For company_admin, auto-select their company.

**To**: Phone number input. Required.

**From**: `Select` dropdown populated from `useSenderNumbers()`. Only shows verified numbers.

**AI Voice mode**:
- Voice Clone: `Select` populated from `useVoiceClones()`. Shows display_name.
- Script: `Textarea` (rows=5). Supports `{{variable}}` placeholders (informational — actual substitution happens backend-side for campaign sends).

**Recording mode**:
- Recording URL: `Input`. URL to an audio file.

**Submit**: Calls `useSendVoicemail()`. Show success message with delivery confirmation. Show error inline on failure.

### Tab 2: Voice Clones (`voice-clones-tab.tsx`)

Voice clone management. Gated behind `voicedrop.manage`.

```
┌──────────────────────────────────────────────────────────┐
│ Voice Clones                                             │
│                                                          │
│ ┌── Create Clone ────────────────────────────────────┐   │
│ │ Display Name:  [_______________]                   │   │
│ │ Recording URL: [_______________]                   │   │
│ │                              [Create Voice Clone]  │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Name          │ Status  │ Created    │ Actions       │ │
│ │───────────────┼─────────┼────────────┼───────────────│ │
│ │ Alice - Sales │ ready   │ Mar 1      │ [Preview][Del]│ │
│ │ Bob - Support │ pending │ Mar 2      │ [Preview][Del]│ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Create form**: Display name + recording URL. The recording URL points to a voice sample that the provider uses to clone the voice.

**Table**: List all clones with name, status, created date, and actions.

**Preview action**: Opens an inline form below the table: "Enter test script" → `Textarea` + "Preview" button. Calls `usePreviewVoiceClone()`. Display the result (audio URL or player if supported, otherwise just show the response).

**Delete action**: Confirmation dialog → `useDeleteVoiceClone()`.

### Tab 3: Sender Numbers (`sender-numbers-tab.tsx`)

Phone number verification flow. Gated behind `voicedrop.manage`.

```
┌──────────────────────────────────────────────────────────┐
│ Sender Numbers                                           │
│                                                          │
│ ┌── Verify New Number ───────────────────────────────┐   │
│ │ Phone Number: [_______________]                    │   │
│ │                            [Send Verification SMS] │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌── Enter Code (shown after SMS sent) ───────────────┐   │
│ │ Phone: 7865551234                                  │   │
│ │ Code:  [______]              [Verify]              │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Phone Number    │ Status   │ Verified At             │ │
│ │─────────────────┼──────────┼─────────────────────────│ │
│ │ +1 786-555-0001 │ verified │ Mar 1, 2026             │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Two-step verification flow**:
1. Enter phone number → click "Send Verification SMS" → calls `useStartVerification()` with `method: "sms"`
2. On success, show the code entry form: phone (read-only) + code input + Verify button → calls `useCompleteVerification()`
3. On verification success, the number appears in the table as "verified"

Manage this with local state: `verifyingNumber: string | null` tracks which number is in the code-entry step.

**Table**: List verified numbers with phone, status badge, verified date.

### Tab 4: Do Not Call (`dnc-tab.tsx`)

DNC list management. Gated behind `voicedrop.manage`.

```
┌──────────────────────────────────────────────────────────┐
│ Do Not Call List                                         │
│                                                          │
│ Add phone numbers that should never receive voicemails.  │
│                                                          │
│ Phone: [_______________]              [Add to DNC]       │
│                                                          │
│ ✓ 7865551234 added to DNC list                          │
└──────────────────────────────────────────────────────────┘
```

Simple: phone input + add button. Calls `useAddToDnc()`. Show success message after add. No list display (the API only has an add endpoint, not a list endpoint).

### Tab 5: Campaign Reports (`campaign-reports-tab.tsx`)

View/export voicemail delivery reports per campaign.

```
┌──────────────────────────────────────────────────────────┐
│ Campaign Reports                                         │
│                                                          │
│ Campaign: [Q2 Multi-Touch ▾]                             │
│                                                          │
│ [Generate Report]                                        │
│                                                          │
│ Report ready: [Download CSV]                             │
└──────────────────────────────────────────────────────────┘
```

**Campaign selector**: `Select` populated from campaigns that have voicemail steps (or just show all campaigns — filtering is optional).

**Generate Report**: Calls `useCampaignVoicemailReport(campaignId)`. The endpoint returns a CSV URL or report data.

**Display**: If the response is a URL, show a download link. If it's inline data, render as a table.

---

## Design Specifications

- **Page padding**: `p-8` as standard.
- **Mode toggle** (Send tab): Two `Button` components side by side. Active: `variant="default"`. Inactive: `variant="outline"`. Labels: "AI Voice" with `Mic` icon, "Recording" with `FileAudio` icon (both from lucide-react).
- **Phone inputs**: Standard `Input`. Consider showing placeholder format: `+17865551234`.
- **Voice clone status badge**: `ready` = success, `pending` = warning, `failed` = destructive.
- **Verification code input**: `Input` with `maxLength={6}`, `font-mono text-center text-lg tracking-widest` for a code-entry feel. Width `max-w-32`.
- **Preview audio**: If the API returns an audio URL, render a simple `<audio controls>` element. Otherwise show the raw response in a code block.
- **DNC tab**: Deliberately minimal — just an input and confirmation. No list because the API doesn't expose one.
- **Campaign report**: If CSV URL returned, style the download link as a `Button variant="secondary"` with `Download` icon.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/voicemail/api.ts` | All voicemail API hooks (~10) |
| `src/features/voicemail/components/send-voicemail-tab.tsx` | Send voicemail form |
| `src/features/voicemail/components/voice-clones-tab.tsx` | Voice clone CRUD + preview |
| `src/features/voicemail/components/sender-numbers-tab.tsx` | Number verification flow |
| `src/features/voicemail/components/dnc-tab.tsx` | Do Not Call management |
| `src/features/voicemail/components/campaign-reports-tab.tsx` | Report generation |
| `src/app/(protected)/voicedrop/page.tsx` | VoiceDrop page |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/permissions.ts` | Add `voicedrop.view` and `voicedrop.manage` permissions |
| `src/components/sidebar.tsx` | Add "VoiceDrop" nav item with `Phone` icon |

## Files NOT to Modify

Do not touch any other files. This feature is entirely self-contained.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. "VoiceDrop" appears in sidebar for `org_admin` and `company_admin`
3. `voicedrop.view` and `voicedrop.manage` permissions work correctly
4. `/voicedrop` page shows 5 tabs
5. Send Voicemail tab has AI Voice / Recording mode toggle
6. AI Voice mode shows voice clone selector + script textarea
7. Recording mode shows recording URL input
8. Send calls the API with correct payload shape (clone+script OR recording_url)
9. Voice Clones tab lists clones, supports create and delete
10. Preview action generates a voice preview from test script
11. Sender Numbers tab supports two-step SMS verification flow
12. Verified numbers appear in the table
13. DNC tab adds phone numbers with confirmation
14. Campaign Reports tab fetches and displays/downloads report
15. From number dropdown populated from verified sender numbers
16. Voice clone dropdown populated from clones list
17. Company context integrated (company_id passed to send endpoint)
18. All management UI gated behind `voicedrop.manage`
19. Loading/empty/error states on all tabs
20. `company_member` cannot access the page

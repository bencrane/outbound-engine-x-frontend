# Directive #21: AI Personalization + Multi-Channel Integration

## Context

This is a Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 frontend. The backend supports **per-lead, per-step content overrides** for multi-channel campaigns. This allows AI-generated personalized content to replace template content on a per-lead basis — different subject lines, email bodies, LinkedIn messages, and voicemail scripts for each lead.

This is the final integration directive. It connects:
- The multi-channel campaign builder (D19) — where sequence templates are defined
- The VoiceDrop module (D20) — voicemail as a channel
- The AI personalization endpoints — per-lead content overrides

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `PUT` | `/api/campaigns/{id}/leads/{lead_id}/step-content` | Set per-lead step content overrides |
| `GET` | `/api/campaigns/{id}/leads/{lead_id}/step-content` | Get per-lead step content overrides |

Also, the existing add-leads endpoint supports inline step content:
```
POST /api/campaigns/{id}/multi-channel-leads
Body: { leads: [{ email, ..., step_content: [{ step_order, action_config_override }] }] }
```

### Step Content Schema

```typescript
interface StepContentOverride {
  step_order: number;
  action_config_override: Record<string, unknown>;
  // For email: { subject, message }
  // For LinkedIn: { message }
  // For direct mail: { description, front, back }
  // For voicemail: { script }
}
```

The `action_config_override` **merges over** the step template's `action_config`. Override keys win. Template-only keys (like `sender_email_id`, `from_number`, `voice_clone_id`) are preserved. This means only the personalized content needs to be provided — structural config stays on the template.

### Existing Code

- Multi-channel sequence editor at `src/features/campaigns/components/multi-channel-sequence-editor.tsx`
- Multi-channel leads tab at `src/features/campaigns/components/multi-channel-leads-tab.tsx`
- Lead progress tab at `src/features/campaigns/components/lead-progress-tab.tsx`
- Campaign detail page at `src/app/(protected)/campaigns/[id]/page.tsx` with multi-channel tab handling
- All campaign hooks in `src/features/campaigns/api.ts`
- `ChannelIcon` component at `src/features/campaigns/components/channel-icon.tsx`

---

## New API Hooks

Add to `src/features/campaigns/api.ts`:

### `useLeadStepContent(campaignId, leadId)`
```
GET /api/campaigns/{campaign_id}/leads/{lead_id}/step-content
Returns: Array<{ step_order: number, action_config_override: Record<string, unknown> }>
```
Query key: `["campaigns", campaignId, "leads", leadId, "step-content"]`
Enabled only when both IDs are truthy.

### `useSaveLeadStepContent()`
```
PUT /api/campaigns/{campaign_id}/leads/{lead_id}/step-content
Body: { steps: Array<{ step_order: number, action_config_override: Record<string, unknown> }> }
Returns: Array of saved step content overrides
```
Mutation. Invalidates `["campaigns", campaignId, "leads", leadId, "step-content"]` on success.

---

## What to Build

### Feature 1: Lead Content Editor

Create `src/features/campaigns/components/lead-content-editor.tsx`.

This is a panel that shows all sequence steps for a specific lead, with the ability to view and edit the AI-generated (or manually written) content overrides.

**Access point**: From the multi-channel leads tab, add a "Personalize" action to each lead's dropdown menu. Clicking opens the content editor in an expandable row (same pattern as lead detail panels elsewhere).

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Personalize: Alice Smith (alice@example.com)         [Close] │
│                                                              │
│ ┌── Step 1: 📧 Email ────────────────────── [has override] ┐ │
│ │ Template subject: "Quick question about {{company}}"      │ │
│ │ Template message: "Hi {{first_name}}, ..."                │ │
│ │                                                           │ │
│ │ Override:                                                 │ │
│ │ Subject: [Hey Alice, saw Acme's Series B — quick q___]    │ │
│ │ Message: [                                              ] │ │
│ │          [Hi Alice, congrats on the raise. We help...   ] │ │
│ │                                              [Save Step]  │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌── Step 2: 🔗 LinkedIn ──────────────────── [no override] ┐ │
│ │ Template message: "Hi {{first_name}}, I sent you an..."   │ │
│ │                                                           │ │
│ │ Override:                                                 │ │
│ │ Message: [________________________________________]       │ │
│ │                                              [Save Step]  │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌── Step 3: 📞 Voicemail ─────────────────── [no override] ┐ │
│ │ Template script: "Hi, this is a follow-up about..."       │ │
│ │                                                           │ │
│ │ Override:                                                 │ │
│ │ Script: [________________________________________]        │ │
│ │                                              [Save Step]  │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                              │
│                                           [Save All Steps]   │
└──────────────────────────────────────────────────────────────┘
```

### Behavior

1. **Fetch sequence** via `useMultiChannelSequence(campaignId)` — shows template content for each step
2. **Fetch existing overrides** via `useLeadStepContent(campaignId, leadId)` — populates override fields with saved values
3. **Display each step** as a card with:
   - Step number + channel icon (use `ChannelIcon`) + action type
   - **Template content** (read-only, muted text) — extracted from the step's `action_config`
   - **Override fields** (editable) — channel-specific inputs:
     - Email: Subject (`Input`) + Message (`Textarea`)
     - LinkedIn: Message (`Textarea`)
     - Direct Mail: Description (`Input`), Front (`Input`), Back (`Input`)
     - Voicemail: Script (`Textarea`)
   - **Status indicator**: badge showing "Has override" (success) or "Using template" (secondary)
   - **Save Step** button — saves just this step's override

4. **Save All Steps** button at the bottom — saves all step overrides in a single PUT call
5. **Save** calls `useSaveLeadStepContent()` with the overrides array. Only includes steps that have non-empty override values.
6. **Clear override** — a small "Reset to template" button per step that clears the override fields

### State Management

- Local state holds the editable override fields per step
- On mount, populate from `useLeadStepContent` data (existing overrides)
- Edits update local state only
- Save pushes to API
- After save, query invalidation refreshes the data

---

### Feature 2: Bulk Personalization Indicator

Update the multi-channel leads tab (`src/features/campaigns/components/multi-channel-leads-tab.tsx`):

Add a "Personalized" column to the leads table:
| Column | Notes |
|--------|-------|
| Personalized | Badge: "Yes" (success) if the lead has any step content overrides, "No" (outline) otherwise |

To determine this without fetching step-content for every lead, use a pragmatic approach: fetch step-content only when the lead row is expanded (lazy). The column starts as "—" and updates when the user clicks "Personalize" on that lead.

Alternatively, if performance allows, fetch all leads' step content in a `useQueries` batch. But this could be expensive for many leads — prefer the lazy approach.

---

### Feature 3: Content Preview Before Activation

Update the campaign detail page activation flow.

When the user clicks "Activate" on a DRAFTED multi-channel campaign, show a **pre-activation review** instead of immediately activating:

Create `src/features/campaigns/components/activation-review.tsx`:

```
┌──────────────────────────────────────────────────────────────┐
│ Review Before Activation                                     │
│                                                              │
│ Campaign: Q2 Multi-Touch - Nexus Labs                        │
│ Steps: 3 (Email → LinkedIn → Voicemail)                      │
│ Leads: 15                                                    │
│                                                              │
│ ┌─── Personalization Status ─────────────────────────────┐   │
│ │ 12 of 15 leads have personalized content               │   │
│ │ 3 leads will use template defaults                     │   │
│ │                                                        │   │
│ │ Leads using templates:                                 │   │
│ │   • carol@example.com                                  │   │
│ │   • dave@example.com                                   │   │
│ │   • eve@example.com                                    │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌─── Sequence Summary ───────────────────────────────────┐   │
│ │ Step 1: 📧 Email — "Quick question about {{company}}" │   │
│ │ Step 2: 🔗 LinkedIn — Connection request (Day +3)      │   │
│ │ Step 3: 📞 Voicemail — AI voice drop (Day +5)          │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ⚠ 3 leads have no phone number (voicemail step will fail)    │
│                                                              │
│                           [Cancel]  [Activate Campaign]      │
└──────────────────────────────────────────────────────────────┘
```

**What it shows**:
1. Campaign name, step count with channel summary, lead count
2. Personalization status — how many leads have overrides vs using templates. List the ones using templates (they may need AI content generated first).
3. Sequence summary — compact step list with channel icons
4. Warnings:
   - Leads missing phone numbers if voicemail steps exist
   - Leads missing email if email steps exist
   - Any steps without a channel config populated
5. Activate button — calls `useActivateCampaign()` on confirm

**How it works**:
- Rendered as a `Dialog` (full-screen or `max-w-2xl`)
- Fetches leads + sequence + step content for all leads
- For personalization status: use `useQueries` to fetch step-content for each lead in parallel. Since this is a one-time pre-activation check, the cost is acceptable.
- After activation: close dialog, refresh campaign detail

---

### Feature 4: Inline Step Content on Lead Enrollment

Update the multi-channel leads tab's add-leads form.

The existing `useAddMultiChannelLeads()` already supports inline `step_content` on each lead. Add an **optional** section to the add-leads form:

After the lead fields (email, name, etc.), add a collapsible "Include personalized content" toggle per lead row. When expanded, show per-step override fields (same channel-specific inputs as the lead content editor, but more compact).

This is for the workflow where AI generates content BEFORE enrollment — the user pastes AI output directly when adding leads.

Keep this optional and collapsed by default — most users will add leads first, then personalize via the editor.

---

## Feature Components

| Component | File | Purpose |
|-----------|------|---------|
| `LeadContentEditor` | `src/features/campaigns/components/lead-content-editor.tsx` | Per-lead content override editor |
| `StepContentForm` | `src/features/campaigns/components/step-content-form.tsx` | Channel-specific override form for a single step |
| `ActivationReview` | `src/features/campaigns/components/activation-review.tsx` | Pre-activation review dialog |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/features/campaigns/components/lead-content-editor.tsx` | Lead personalization panel |
| `src/features/campaigns/components/step-content-form.tsx` | Per-step override form |
| `src/features/campaigns/components/activation-review.tsx` | Pre-activation review + warnings |

## Files to Modify

| File | Change |
|------|--------|
| `src/features/campaigns/api.ts` | Add `useLeadStepContent` + `useSaveLeadStepContent` hooks |
| `src/features/campaigns/components/multi-channel-leads-tab.tsx` | Add "Personalize" action to lead dropdown, integrate `LeadContentEditor` as expandable row |
| `src/app/(protected)/campaigns/[id]/page.tsx` | Replace direct activate call with `ActivationReview` dialog |

## Files NOT to Modify

Do not touch: `src/lib/`, `src/components/`, existing single-channel components, dashboard, inbox, leads, settings, direct mail, voicedrop pages. Do not modify the sequence editor or view components.

---

## Design Specifications

- **Lead Content Editor**: Expandable row below the lead in the leads table. Full `colSpan`. Background `bg-zinc-900/50`.
- **Template content display**: `text-zinc-500 text-sm italic` — shows what the template says so the user knows what they're overriding.
- **Override fields**: Standard `Input`/`Textarea` with `Label`. Pre-populated from saved overrides if they exist.
- **Status badge per step**: "Has override" = `variant="success"`. "Using template" = `variant="secondary"`.
- **"Reset to template" button**: Small `Button variant="ghost" size="sm"` with `RotateCcw` icon. Clears the override fields for that step.
- **Save All Steps button**: `Button variant="default"` at the bottom of the editor. Shows "Saving..." when pending.
- **Activation Review dialog**: Use shared `Dialog` component with `max-w-2xl`. Clean layout with sections in `Card` components.
- **Personalization status**: Green text for "X leads personalized", muted text for "Y leads using templates". List template-only leads with bullet points.
- **Warnings**: Yellow `bg-yellow-600/10 border-yellow-500/30 text-yellow-400 rounded-lg p-3` warning cards. Use `AlertTriangle` icon from lucide-react.
- **Activate button in review**: `Button variant="default"` (blue), prominent. Disabled while mutation is pending.

---

## Acceptance Criteria

1. `npm run build` succeeds with zero TypeScript errors
2. "Personalize" action appears in multi-channel lead dropdown (gated by `campaigns.manage`)
3. Lead content editor expands as an inline panel showing all sequence steps
4. Template content displayed read-only for each step
5. Override fields are channel-specific (email: subject+message, LinkedIn: message, voicemail: script, direct mail: description+front+back)
6. Save Step saves a single step's override via PUT endpoint
7. Save All Steps saves all overrides in one call
8. Existing overrides pre-populate the form on load
9. "Reset to template" clears override fields for a step
10. Activation review dialog shows before activating a multi-channel campaign
11. Review shows personalization status (how many leads have overrides)
12. Review shows warnings for missing lead data (no phone for voicemail, no email for email)
13. Review shows sequence summary with channel icons
14. Activate button in review calls the API and refreshes campaign detail
15. Add-leads form has optional inline step content toggle (collapsed by default)
16. Loading/error states on all new components
17. No regressions to existing multi-channel campaign flows

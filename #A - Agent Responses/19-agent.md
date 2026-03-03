Implemented Directive 19 across the campaign API layer, list page, create dialog, detail page, and all required new multi-channel components.
What changed
New multi-channel API hooks in src/features/campaigns/api.ts
Added:
useCreateMultiChannelCampaign()
useMultiChannelSequence(campaignId)
useSaveMultiChannelSequence()
useAddMultiChannelLeads()
useActivateCampaign()
useLeadProgress(campaignId, filters?)
useSingleLeadProgress(campaignId, leadId)
Added multi-channel types (MultiChannelStep, LeadProgress, etc.) and query keys:
["campaigns", campaignId, "multi-channel-sequence"]
["campaigns", campaignId, "lead-progress", filters]
["campaigns", campaignId, "leads", leadId, "progress"]
Kept existing single-channel hooks intact.
Campaign list updated in src/app/(protected)/campaigns/page.tsx
Added campaignType to UnifiedCampaign.
Maps campaign_type: "multi_channel" campaigns from useCampaigns() to channel: "multi".
Multi-channel campaigns now route to /campaigns/{id}?channel=multi.
Added channel filter button: Multi-Channel.
Added Multi-Channel badge (variant="default") with Layers icon.
Preserved existing email/LinkedIn behavior and bulk-selection constraints.
Create campaign dialog updated in src/features/campaigns/components/create-campaign-dialog.tsx
Added third channel card: Multi-Channel (Layers icon).
Multi-channel creation uses useCreateMultiChannelCampaign().
On success navigates to /campaigns/{id}?channel=multi.
Keeps LinkedIn-only fields hidden unless LinkedIn is selected.
Campaign detail page updated in src/app/(protected)/campaigns/[id]/page.tsx
Added channel=multi handling.
Multi-channel tabs:
Sequence (default)
Leads
Progress
Overview
Added multi-channel status actions:
DRAFTED: Activate (validates sequence + leads exist)
ACTIVE: Pause / Stop
PAUSED: Resume / Stop
Existing email/LinkedIn tab structure and actions remain unchanged.
New components created
src/features/campaigns/components/channel-icon.tsx
src/features/campaigns/components/step-progress-badge.tsx
src/features/campaigns/components/multi-channel-step-form.tsx
src/features/campaigns/components/multi-channel-sequence-view.tsx
src/features/campaigns/components/multi-channel-sequence-editor.tsx
src/features/campaigns/components/multi-channel-leads-tab.tsx
src/features/campaigns/components/lead-progress-tab.tsx
Behavior now covered
Multi-channel campaigns display correctly in list with badge/filter/routing.
Create dialog supports multi-channel campaign creation.
Multi-channel detail page has the correct tab model and default tab.
Sequence editor supports:
add/remove/reorder
per-channel action config
delay + skip condition
save/cancel
read-only view + edit gating to DRAFTED
Multi-channel leads tab supports adding leads (including phone), listing leads, and lead actions.
Progress dashboard supports status filtering, table display, channel-aware step display, and expandable single-lead detail fetch.
Validation
Ran npm run build successfully (no TypeScript build errors).
Ran lints for edited files (ReadLints) with no issues.
If you want, I can do a follow-up pass to tighten UX polish (e.g., richer read-only config summaries, stricter field validation per action type, and optional deep-linking to tabs via query params).
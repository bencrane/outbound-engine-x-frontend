Implemented Directive 21 with only the allowed file set.
Added API hooks in src/features/campaigns/api.ts
New types:
StepContentOverride
MultiChannelLeadInput.step_content now typed as StepContentOverride[]
New query key:
campaignQueryKeys.leadStepContent(campaignId, leadId)
New functions:
fetchLeadStepContent(campaignId, leadId) (shared fetch helper)
useLeadStepContent(campaignId, leadId) (GET)
useSaveLeadStepContent() (PUT + invalidation)
New components created
src/features/campaigns/components/step-content-form.tsx
Channel-specific override form for one step
Template display (text-zinc-500 text-sm italic)
Status badge (Has override / Using template)
Reset button with RotateCcw
Utility exports for override normalization/parsing
src/features/campaigns/components/lead-content-editor.tsx
Inline expandable editor per lead
Fetches sequence + existing overrides
Per-step Save Step
Global Save All Steps
Reset to template behavior
Emits lazy personalization status back to parent
src/features/campaigns/components/activation-review.tsx
Pre-activation Dialog (max-w-2xl)
Shows campaign/step/lead summary
Uses useQueries + fetchLeadStepContent for all leads
Personalization status section
Sequence summary with ChannelIcon
Warning cards for:
missing phone on voicemail campaigns
missing email on email campaigns
steps with empty action_config
Confirm activation via useActivateCampaign()
Updated multi-channel-leads-tab.tsx
Added Personalized column
Lazy state starts as -
Updates to Yes/No once lead editor data is loaded/saved
Added Personalize dropdown action
Expands inline row (bg-zinc-900/50) with LeadContentEditor
Added optional inline enrollment personalization
Per-row toggle: “Include personalized content” (collapsed default)
Uses sequence-aware StepContentForm inputs
Submits step_content with step_order + action_config_override
Updated campaign detail activation flow in src/app/(protected)/campaigns/[id]/page.tsx
Replaced direct activation click behavior with ActivationReview dialog for drafted multi-channel campaigns
Activation now happens from the review dialog’s confirm button
Validation
npm run build passes (zero TypeScript errors)
Lints for all touched files: no errors
If you want next, I can tighten one behavior: make Save Step in the editor persist only that step without touching unsaved edits in other steps while still preserving previously saved steps server-side (currently it safely persists using the current saved baseline + the current step change).
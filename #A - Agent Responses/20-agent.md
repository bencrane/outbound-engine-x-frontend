Implemented Directive 20 end-to-end, scoped only to the allowed files.
What I changed
Added VoiceDrop RBAC in src/lib/permissions.ts
New permissions: voicedrop.view, voicedrop.manage
Role grants:
org_admin: both
company_admin: voicedrop.view only
company_member: neither
Added VoiceDrop nav item in src/components/sidebar.tsx
Inserted between Direct Mail and Settings
Uses Phone icon
Permission-gated by voicedrop.view
Created full voicemail feature module:
src/features/voicemail/api.ts
src/features/voicemail/components/send-voicemail-tab.tsx
src/features/voicemail/components/voice-clones-tab.tsx
src/features/voicemail/components/sender-numbers-tab.tsx
src/features/voicemail/components/dnc-tab.tsx
src/features/voicemail/components/campaign-reports-tab.tsx
Created protected page route:
src/app/(protected)/voicedrop/page.tsx
Wrapped with RouteGuard permission="voicedrop.view"
5 tabs: Send, Voice Clones, Sender Numbers, DNC, Reports
Feature behavior delivered
Send tab
AI Voice / Recording toggle with Mic + FileAudio button modes
Company resolution integrated:
org admin selects company from context companies
company admin uses own company_id
Verified sender numbers dropdown from /sender-numbers
Voice clone selector from /voice-clones
Payload validation enforces:
AI mode => voice_clone_id + script
Recording mode => recording_url
Sends via POST /api/voicemail/send
Voice Clones tab
Create clone form (display_name, recording_url)
Clone table with status badges and created date
Delete with confirmation
Preview flow with test script
If preview returns audio URL, renders <audio controls>; otherwise raw JSON response
Sender Numbers tab
Two-step SMS verification flow
Start: POST /verify with method: "sms"
Complete: POST /verify-code with 6-digit styled code input
Sender numbers table with status badge + verified date
Invalidates and refreshes list after successful code verification
DNC tab
Minimal add-to-DNC form
Sends POST /api/voicemail/dnc
Inline success/error feedback
Campaign Reports tab
Campaign selector (email + LinkedIn campaigns)
Generate report against selected campaign
If URL returned, shows Download CSV button with Download icon
If inline data returned, renders table (or JSON fallback)
Management gating
All management tab content is gated by voicedrop.manage with clear no-access messaging
Validation
npm run build passes successfully with zero TypeScript errors.
ReadLints on all touched files reports no linter errors.
/voicedrop route is present in build output
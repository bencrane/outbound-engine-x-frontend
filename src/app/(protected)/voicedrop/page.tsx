"use client";

import { RouteGuard } from "@/components/route-guard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignReportsTab } from "@/features/voicemail/components/campaign-reports-tab";
import { DncTab } from "@/features/voicemail/components/dnc-tab";
import { SendVoicemailTab } from "@/features/voicemail/components/send-voicemail-tab";
import { SenderNumbersTab } from "@/features/voicemail/components/sender-numbers-tab";
import { VoiceClonesTab } from "@/features/voicemail/components/voice-clones-tab";

export default function VoiceDropPage() {
  return (
    <RouteGuard permission="voicedrop.view">
      <div className="p-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">VoiceDrop</h1>
          <p className="mt-1 text-zinc-400">
            Ringless voicemail - deliver voicemails without ringing
          </p>
        </div>

        <Tabs defaultValue="send" className="mt-6">
          <TabsList>
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="voice-clones">Voice Clones</TabsTrigger>
            <TabsTrigger value="sender-numbers">Sender Numbers</TabsTrigger>
            <TabsTrigger value="dnc">DNC</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="send">
            <SendVoicemailTab />
          </TabsContent>
          <TabsContent value="voice-clones">
            <VoiceClonesTab />
          </TabsContent>
          <TabsContent value="sender-numbers">
            <SenderNumbersTab />
          </TabsContent>
          <TabsContent value="dnc">
            <DncTab />
          </TabsContent>
          <TabsContent value="reports">
            <CampaignReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </RouteGuard>
  );
}

"use client";

import { FileAudio, Mic } from "lucide-react";
import { useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useSendVoicemail,
  useSenderNumbers,
  useVoiceClones,
} from "@/features/voicemail/api";
import { useAuth } from "@/lib/auth-context";
import { useCompanyContext } from "@/lib/company-context";

type SendMode = "ai" | "recording";

export function SendVoicemailTab() {
  const canManage = usePermission("voicedrop.manage");
  const { user } = useAuth();
  const { companies, selectedCompanyId } = useCompanyContext();
  const isOrgAdmin = user?.role === "org_admin";
  const companyAdminCompanyId = user?.company_id ?? "";

  const { data: senderNumbers = [], isLoading: senderLoading, error: senderError } =
    useSenderNumbers();
  const { data: voiceClones = [], isLoading: clonesLoading, error: clonesError } = useVoiceClones();
  const sendVoicemail = useSendVoicemail();

  const [mode, setMode] = useState<SendMode>("ai");
  const [companyId, setCompanyId] = useState(selectedCompanyId ?? "");
  const [to, setTo] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [voiceCloneId, setVoiceCloneId] = useState("");
  const [script, setScript] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const verifiedSenderNumbers = useMemo(
    () =>
      senderNumbers.filter(
        (number) => String(number.status ?? "").toLowerCase() === "verified"
      ),
    [senderNumbers]
  );

  const resolvedCompanyId = isOrgAdmin ? companyId : companyAdminCompanyId;

  if (!canManage) {
    return <p className="text-sm text-zinc-400">You do not have permission to send voicemails.</p>;
  }

  const submit = () => {
    setFeedback(null);
    if (!resolvedCompanyId) {
      setFeedback("Select a company.");
      return;
    }
    if (!to.trim()) {
      setFeedback("Recipient phone number is required.");
      return;
    }
    if (!fromNumber.trim()) {
      setFeedback("Verified sender number is required.");
      return;
    }

    if (mode === "ai") {
      if (!voiceCloneId.trim() || !script.trim()) {
        setFeedback("AI Voice mode requires voice clone and script.");
        return;
      }
      sendVoicemail.mutate(
        {
          company_id: resolvedCompanyId,
          to: to.trim(),
          from_number: fromNumber.trim(),
          voice_clone_id: voiceCloneId.trim(),
          script: script.trim(),
        },
        {
          onSuccess: () => {
            setFeedback("Voicemail queued for delivery.");
            setTo("");
            setScript("");
          },
          onError: (error) => {
            setFeedback(error.message || "Failed to send voicemail.");
          },
        }
      );
      return;
    }

    if (!recordingUrl.trim()) {
      setFeedback("Recording URL is required in Recording mode.");
      return;
    }

    sendVoicemail.mutate(
      {
        company_id: resolvedCompanyId,
        to: to.trim(),
        from_number: fromNumber.trim(),
        recording_url: recordingUrl.trim(),
      },
      {
        onSuccess: () => {
          setFeedback("Voicemail queued for delivery.");
          setTo("");
          setRecordingUrl("");
        },
        onError: (error) => {
          setFeedback(error.message || "Failed to send voicemail.");
        },
      }
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-lg font-medium text-white">Send Voicemail</h3>

      <div className="flex items-center gap-2">
        <Button variant={mode === "ai" ? "default" : "outline"} onClick={() => setMode("ai")}>
          <Mic className="mr-1 h-4 w-4" />
          AI Voice
        </Button>
        <Button
          variant={mode === "recording" ? "default" : "outline"}
          onClick={() => setMode("recording")}
        >
          <FileAudio className="mr-1 h-4 w-4" />
          Recording
        </Button>
      </div>

      {isOrgAdmin && (
        <div className="space-y-2">
          <Label>Company</Label>
          <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>To (phone)</Label>
          <Input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="+17865551234"
          />
        </div>
        <div className="space-y-2">
          <Label>From (verified sender)</Label>
          <Select value={fromNumber} onChange={(event) => setFromNumber(event.target.value)}>
            <option value="">Select verified number</option>
            {verifiedSenderNumbers.map((number) => (
              <option key={number.phone_number} value={number.phone_number}>
                {number.phone_number}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {mode === "ai" ? (
        <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
          <p className="text-sm font-medium text-zinc-200">AI Voice Mode</p>
          <div className="space-y-2">
            <Label>Voice Clone</Label>
            <Select value={voiceCloneId} onChange={(event) => setVoiceCloneId(event.target.value)}>
              <option value="">Select voice clone</option>
              {voiceClones.map((clone) => (
                <option key={clone.id} value={clone.id}>
                  {clone.display_name ?? clone.id}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Script</Label>
            <Textarea
              rows={5}
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Hi {{first_name}}, this is a quick message..."
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
          <Label>Recording URL</Label>
          <Input
            value={recordingUrl}
            onChange={(event) => setRecordingUrl(event.target.value)}
            placeholder="https://example.com/audio.mp3"
          />
        </div>
      )}

      {(senderError || clonesError) && (
        <p className="text-sm text-red-400">Failed to load sender numbers or voice clones.</p>
      )}
      {(senderLoading || clonesLoading) && (
        <p className="text-sm text-zinc-400">Loading voicemail configuration...</p>
      )}
      {feedback && (
        <p className={`text-sm ${feedback.includes("Failed") ? "text-red-400" : "text-zinc-300"}`}>
          {feedback}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={sendVoicemail.isPending}>
          {sendVoicemail.isPending ? "Sending..." : "Send Voicemail"}
        </Button>
      </div>
    </div>
  );
}

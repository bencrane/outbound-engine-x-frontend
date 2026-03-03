"use client";

import { useState } from "react";

import { usePermission } from "@/components/gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAddToDnc } from "@/features/voicemail/api";

export function DncTab() {
  const canManage = usePermission("voicedrop.manage");
  const addToDnc = useAddToDnc();
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!canManage) {
    return <p className="text-sm text-zinc-400">You do not have permission to manage DNC.</p>;
  }

  const submit = () => {
    setFeedback(null);
    if (!phone.trim()) {
      setFeedback("Phone number is required.");
      return;
    }

    addToDnc.mutate(
      { phone: phone.trim() },
      {
        onSuccess: () => {
          setFeedback(`${phone.trim()} added to DNC list.`);
          setPhone("");
        },
        onError: (error) => {
          setFeedback(error.message || "Failed to add phone to DNC.");
        },
      }
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
      <h3 className="text-lg font-medium text-white">Do Not Call List</h3>
      <p className="text-sm text-zinc-400">
        Add phone numbers that should never receive voicemails.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+17865551234"
          className="max-w-sm"
        />
        <Button onClick={submit} disabled={addToDnc.isPending}>
          {addToDnc.isPending ? "Adding..." : "Add to DNC"}
        </Button>
      </div>
      {feedback && (
        <p className={`text-sm ${feedback.includes("Failed") ? "text-red-400" : "text-zinc-300"}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}

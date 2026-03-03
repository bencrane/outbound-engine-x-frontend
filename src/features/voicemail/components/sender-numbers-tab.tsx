"use client";

import { useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCompleteVerification,
  useSenderNumbers,
  useStartVerification,
} from "@/features/voicemail/api";
import { formatDate } from "@/lib/format";

export function SenderNumbersTab() {
  const canManage = usePermission("voicedrop.manage");
  const { data: senderNumbers = [], isLoading, error } = useSenderNumbers();
  const startVerification = useStartVerification();
  const completeVerification = useCompleteVerification();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [verifyingNumber, setVerifyingNumber] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const sortedNumbers = useMemo(
    () =>
      senderNumbers
        .slice()
        .sort((a, b) => {
          const first = String(a.phone_number ?? "");
          const second = String(b.phone_number ?? "");
          return first.localeCompare(second);
        }),
    [senderNumbers]
  );

  if (!canManage) {
    return (
      <p className="text-sm text-zinc-400">
        You do not have permission to manage sender numbers.
      </p>
    );
  }

  const sendSms = () => {
    setFeedback(null);
    if (!phoneNumber.trim()) {
      setFeedback("Phone number is required.");
      return;
    }

    startVerification.mutate(
      { phone_number: phoneNumber.trim(), method: "sms" },
      {
        onSuccess: () => {
          setVerifyingNumber(phoneNumber.trim());
          setVerificationCode("");
          setFeedback("Verification SMS sent.");
        },
        onError: (mutationError) => {
          setFeedback(mutationError.message || "Failed to send verification SMS.");
        },
      }
    );
  };

  const verifyCode = () => {
    if (!verifyingNumber) {
      return;
    }
    setFeedback(null);
    if (!verificationCode.trim()) {
      setFeedback("Verification code is required.");
      return;
    }

    completeVerification.mutate(
      { phone_number: verifyingNumber, code: verificationCode.trim() },
      {
        onSuccess: () => {
          setFeedback("Phone number verified.");
          setPhoneNumber("");
          setVerifyingNumber(null);
          setVerificationCode("");
        },
        onError: (mutationError) => {
          setFeedback(mutationError.message || "Failed to verify code.");
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
        <h3 className="text-lg font-medium text-white">Verify New Number</h3>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+17865551234"
            />
          </div>
          <Button onClick={sendSms} disabled={startVerification.isPending}>
            {startVerification.isPending ? "Sending..." : "Send Verification SMS"}
          </Button>
        </div>
      </div>

      {verifyingNumber && (
        <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
          <h4 className="text-sm font-medium text-zinc-200">Enter Code</h4>
          <p className="text-sm text-zinc-400">Phone: {verifyingNumber}</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                maxLength={6}
                className="max-w-32 font-mono text-center text-lg tracking-widest"
                placeholder="123456"
              />
            </div>
            <Button onClick={verifyCode} disabled={completeVerification.isPending}>
              {completeVerification.isPending ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-400">Failed to load sender numbers.</p>
      ) : isLoading ? (
        <p className="text-sm text-zinc-400">Loading sender numbers...</p>
      ) : sortedNumbers.length === 0 ? (
        <p className="text-sm text-zinc-400">No sender numbers found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedNumbers.map((number) => (
                <TableRow key={number.phone_number}>
                  <TableCell>{number.phone_number}</TableCell>
                  <TableCell>{toStatusBadge(String(number.status ?? "unknown"))}</TableCell>
                  <TableCell>
                    {number.verified_at ? formatDate(String(number.verified_at)) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {feedback && (
        <p className={`text-sm ${feedback.includes("Failed") ? "text-red-400" : "text-zinc-300"}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}

function toStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "verified" || normalized === "ready") {
    return <Badge variant="success">{status}</Badge>;
  }
  if (normalized === "pending") {
    return <Badge variant="warning">{status}</Badge>;
  }
  if (normalized === "failed") {
    return <Badge variant="destructive">{status}</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useBulkVerifyAddresses,
  useVerifyAddress,
  type DirectMailAddressVerificationResponse,
} from "@/features/direct-mail/api";

export function AddressVerification() {
  const verifyAddress = useVerifyAddress();
  const bulkVerifyAddresses = useBulkVerifyAddresses();

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [bulkInput, setBulkInput] = useState("");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verify Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Address Line 1</Label>
              <Input value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address Line 2</Label>
              <Input value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(event) => setCity(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                maxLength={2}
                value={state}
                onChange={(event) => setState(event.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label>Zip Code</Label>
              <Input value={zipCode} onChange={(event) => setZipCode(event.target.value)} />
            </div>
          </div>

          <Button
            disabled={verifyAddress.isPending}
            onClick={() =>
              verifyAddress.mutate({
                payload: {
                  primary_line: addressLine1.trim(),
                  secondary_line: addressLine2.trim() || undefined,
                  city: city.trim(),
                  state: state.trim(),
                  zip_code: zipCode.trim(),
                },
              })
            }
          >
            {verifyAddress.isPending ? "Verifying..." : "Verify Address"}
          </Button>

          {verifyAddress.error && (
            <p className="text-sm text-red-400">Failed to verify address.</p>
          )}

          {verifyAddress.data && <VerificationResult result={verifyAddress.data} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            placeholder="One per line: address_line1, city, state, zip_code"
            value={bulkInput}
            onChange={(event) => setBulkInput(event.target.value)}
          />
          <Button
            variant="secondary"
            disabled={bulkVerifyAddresses.isPending}
            onClick={() => {
              const addresses = parseBulkInput(bulkInput);
              bulkVerifyAddresses.mutate({ payload: { addresses } });
            }}
          >
            {bulkVerifyAddresses.isPending ? "Verifying..." : "Verify Bulk Addresses"}
          </Button>
          {bulkVerifyAddresses.error && (
            <p className="text-sm text-red-400">Failed to bulk verify addresses.</p>
          )}
          {bulkVerifyAddresses.data && bulkVerifyAddresses.data.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-zinc-800">
              <table className="min-w-full text-sm">
                <thead className="border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Normalized Address</th>
                    <th className="px-3 py-2 text-left">Provider Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkVerifyAddresses.data.map((result, index) => (
                    <tr key={`${result.raw_provider_status ?? "row"}-${index}`} className="border-b border-zinc-800">
                      <td className="px-3 py-2 text-zinc-300">{index + 1}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={result.status} />
                      </td>
                      <td className="px-3 py-2 text-zinc-300">
                        {formatNormalizedAddress(result.normalized_address)}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{result.raw_provider_status ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationResult({ result }: { result: DirectMailAddressVerificationResponse }) {
  const emphasis =
    result.status === "deliverable"
      ? "border-emerald-500/40 bg-emerald-950/20"
      : result.status === "undeliverable"
        ? "border-red-500/40 bg-red-950/20"
        : "border-yellow-500/40 bg-yellow-950/20";

  return (
    <div className={`rounded-md border p-3 ${emphasis}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-300">Status:</span>
        <StatusBadge status={result.status} />
      </div>
      <p className="mt-2 text-sm text-zinc-300">
        Normalized: {formatNormalizedAddress(result.normalized_address)}
      </p>
      <p className="mt-1 text-sm text-zinc-400">Provider status: {result.raw_provider_status ?? "-"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "deliverable") return <Badge variant="success">Deliverable</Badge>;
  if (status === "undeliverable") return <Badge variant="destructive">Undeliverable</Badge>;
  if (status === "corrected") return <Badge variant="warning">Corrected</Badge>;
  if (status === "partial") return <Badge variant="warning">Partial</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

function formatNormalizedAddress(address: Record<string, unknown> | null | undefined): string {
  if (!address) return "-";
  const line1 = asString(address.primary_line ?? address.address_line1 ?? "");
  const line2 = asString(address.secondary_line ?? address.address_line2 ?? "");
  const city = asString(address.city ?? "");
  const state = asString(address.state ?? "");
  const zip = asString(address.zip_code ?? "");
  return [line1, line2, `${city} ${state} ${zip}`.trim()].filter(Boolean).join(", ");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseBulkInput(input: string): Array<Record<string, unknown>> {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [primary_line, city, state, zip_code] = line.split(",").map((part) => part.trim());
      return {
        primary_line,
        city,
        state,
        zip_code,
      };
    });
}

"use client";

import { useMemo, useState } from "react";

import { usePermission } from "@/components/gate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDirectMailPiece,
  type PieceType,
} from "@/features/direct-mail/api";
import { useCompanies } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";

interface CreatePieceDialogProps {
  open: boolean;
  onClose: () => void;
}

type AddressDraft = {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
};

const emptyAddress: AddressDraft = {
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip_code: "",
};

export function CreatePieceDialog({ open, onClose }: CreatePieceDialogProps) {
  const canManage = usePermission("direct-mail.manage");
  const { user } = useAuth();
  const { data: companies = [] } = useCompanies();
  const createPiece = useCreateDirectMailPiece();

  const [pieceType, setPieceType] = useState<PieceType>("postcards");
  const [companyId, setCompanyId] = useState("");
  const [toAddress, setToAddress] = useState<AddressDraft>(emptyAddress);
  const [fromAddress, setFromAddress] = useState<AddressDraft>(emptyAddress);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [size, setSize] = useState("4x6");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [rawPayload, setRawPayload] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isOrgAdmin = user?.role === "org_admin";
  const canSubmit = canManage && createPiece.isPending === false;
  const rawExample = useMemo(
    () =>
      JSON.stringify(
        {
          to: {
            name: "Jane Smith",
            address_line1: "123 Main St",
            city: "New York",
            state: "NY",
            zip_code: "10001",
          },
          from: {
            name: "Acme Inc",
            address_line1: "500 Market St",
            city: "San Francisco",
            state: "CA",
            zip_code: "94105",
          },
          front: "<html>Front content</html>",
          back: "<html>Back content</html>",
          size: "4x6",
        },
        null,
        2
      ),
    []
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl p-5">
        <DialogHeader className="px-0 pt-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>Create Direct Mail Piece</DialogTitle>
              <DialogDescription className="mt-1">
                Create postcards, letters, self-mailers, or checks.
              </DialogDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Piece Type</Label>
              <Select
                value={pieceType}
                onChange={(event) => setPieceType(event.target.value as PieceType)}
                disabled={!canManage}
              >
                <option value="postcards">Postcard</option>
                <option value="letters">Letter</option>
                <option value="self-mailers">Self-Mailer</option>
                <option value="checks">Check</option>
              </Select>
            </div>

            {isOrgAdmin && (
              <div className="space-y-2">
                <Label>Company</Label>
                <Select
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                  disabled={!canManage}
                >
                  <option value="">Default company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AddressSection
              title="To Address"
              value={toAddress}
              disabled={!canManage}
              onChange={setToAddress}
            />
            <AddressSection
              title="From Address"
              value={fromAddress}
              disabled={!canManage}
              onChange={setFromAddress}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Front</Label>
              <Textarea
                rows={3}
                value={front}
                onChange={(event) => setFront(event.target.value)}
                placeholder="HTML or template URL"
                disabled={!canManage}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Back</Label>
              <Textarea
                rows={3}
                value={back}
                onChange={(event) => setBack(event.target.value)}
                placeholder="Back side content"
                disabled={!canManage}
              />
            </div>

            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={size} onChange={(event) => setSize(event.target.value)} disabled={!canManage}>
                <option value="4x6">4x6</option>
                <option value="6x9">6x9</option>
                <option value="6x11">6x11</option>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <Button
              variant="outline"
              size="sm"
              disabled={!canManage}
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? "Hide Advanced" : "Show Advanced"}
            </Button>
            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label>Idempotency Key (optional)</Label>
                  <Input
                    value={idempotencyKey}
                    onChange={(event) => setIdempotencyKey(event.target.value)}
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Raw JSON Payload (optional override)</Label>
                  <Textarea
                    rows={10}
                    className="font-mono text-sm"
                    value={rawPayload}
                    onChange={(event) => setRawPayload(event.target.value)}
                    placeholder={rawExample}
                    disabled={!canManage}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              disabled={!canSubmit}
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                const payload = buildPayload({
                  toAddress,
                  fromAddress,
                  front,
                  back,
                  size,
                  rawPayload,
                });

                if (!payload.success) {
                  setErrorMessage(payload.error);
                  return;
                }

                createPiece.mutate(
                  {
                    pieceType,
                    payload: payload.payload,
                    company_id: companyId || undefined,
                    idempotency_key: idempotencyKey || undefined,
                  },
                  {
                    onSuccess: () => {
                      setSuccessMessage("Piece created successfully.");
                      onClose();
                    },
                  }
                );
              }}
            >
              {createPiece.isPending ? "Creating..." : "Create Piece"}
            </Button>
          </div>

          {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
          {createPiece.error && <p className="text-sm text-red-400">Failed to create piece.</p>}
          {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddressSection({
  title,
  value,
  onChange,
  disabled,
}: {
  title: string;
  value: AddressDraft;
  onChange: (value: AddressDraft) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <Input
        placeholder="Name"
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        disabled={disabled}
      />
      <Input
        placeholder="Address Line 1"
        value={value.address_line1}
        onChange={(event) => onChange({ ...value, address_line1: event.target.value })}
        disabled={disabled}
      />
      <Input
        placeholder="Address Line 2"
        value={value.address_line2}
        onChange={(event) => onChange({ ...value, address_line2: event.target.value })}
        disabled={disabled}
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="City"
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          disabled={disabled}
        />
        <Input
          placeholder="ST"
          maxLength={2}
          value={value.state}
          onChange={(event) => onChange({ ...value, state: event.target.value.toUpperCase() })}
          disabled={disabled}
        />
        <Input
          placeholder="Zip"
          value={value.zip_code}
          onChange={(event) => onChange({ ...value, zip_code: event.target.value })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function buildPayload({
  toAddress,
  fromAddress,
  front,
  back,
  size,
  rawPayload,
}: {
  toAddress: AddressDraft;
  fromAddress: AddressDraft;
  front: string;
  back: string;
  size: string;
  rawPayload: string;
}): { success: true; payload: Record<string, unknown> } | { success: false; error: string } {
  if (rawPayload.trim()) {
    try {
      const parsed = JSON.parse(rawPayload);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { success: false, error: "Raw JSON payload must be an object." };
      }
      return { success: true, payload: parsed as Record<string, unknown> };
    } catch {
      return { success: false, error: "Raw JSON payload is not valid JSON." };
    }
  }

  if (
    !toAddress.address_line1.trim() ||
    !toAddress.city.trim() ||
    !toAddress.state.trim() ||
    !toAddress.zip_code.trim()
  ) {
    return { success: false, error: "To address line 1, city, state, and zip are required." };
  }

  if (
    !fromAddress.address_line1.trim() ||
    !fromAddress.city.trim() ||
    !fromAddress.state.trim() ||
    !fromAddress.zip_code.trim()
  ) {
    return {
      success: false,
      error: "From address line 1, city, state, and zip are required.",
    };
  }

  if (!front.trim()) {
    return { success: false, error: "Front content is required." };
  }

  const payload: Record<string, unknown> = {
    to: {
      name: toAddress.name.trim() || undefined,
      address_line1: toAddress.address_line1.trim(),
      address_line2: toAddress.address_line2.trim() || undefined,
      city: toAddress.city.trim(),
      state: toAddress.state.trim(),
      zip_code: toAddress.zip_code.trim(),
    },
    from: {
      name: fromAddress.name.trim() || undefined,
      address_line1: fromAddress.address_line1.trim(),
      address_line2: fromAddress.address_line2.trim() || undefined,
      city: fromAddress.city.trim(),
      state: fromAddress.state.trim(),
      zip_code: fromAddress.zip_code.trim(),
    },
    front: front.trim(),
    back: back.trim() || undefined,
    size,
  };

  return { success: true, payload };
}

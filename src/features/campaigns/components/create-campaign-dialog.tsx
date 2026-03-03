"use client";

import { Linkedin, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCampaign,
  useCreateLinkedinCampaign,
} from "@/features/campaigns/api";
import { useAuth } from "@/lib/auth-context";
import { useCompanies } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface CreateCampaignDialogProps {
  open: boolean;
  onClose: () => void;
}

type Channel = "email" | "linkedin";

export function CreateCampaignDialog({ open, onClose }: CreateCampaignDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: companies = [] } = useCompanies();
  const createCampaign = useCreateCampaign();
  const createLinkedinCampaign = useCreateLinkedinCampaign();

  const [channel, setChannel] = useState<Channel>("email");
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [description, setDescription] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [delayBetweenActions, setDelayBetweenActions] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isOrgAdmin = user?.role === "org_admin";
  const isPending = createCampaign.isPending || createLinkedinCampaign.isPending;

  const resolvedCompanyId = useMemo(() => {
    if (isOrgAdmin) {
      return companyId.trim() || undefined;
    }
    return user?.company_id ?? undefined;
  }, [companyId, isOrgAdmin, user?.company_id]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setErrorMessage("");
    setChannel("email");
    setName("");
    setDescription("");
    setDailyLimit("");
    setDelayBetweenActions("");
    setCompanyId(isOrgAdmin ? "" : user?.company_id ?? "");
  }, [isOrgAdmin, open, user?.company_id]);

  const handleSubmit = () => {
    setErrorMessage("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Campaign name is required.");
      return;
    }

    if (channel === "email") {
      createCampaign.mutate(
        {
          name: trimmedName,
          company_id: resolvedCompanyId,
        },
        {
          onSuccess: (campaign) => {
            onClose();
            router.push(`/campaigns/${campaign.id}?channel=email`);
          },
          onError: () => {
            setErrorMessage("Failed to create campaign.");
          },
        }
      );
      return;
    }

    const parsedDailyLimit = parseOptionalNumber(dailyLimit);
    if (dailyLimit.trim() && parsedDailyLimit === null) {
      setErrorMessage("Daily limit must be a valid number.");
      return;
    }

    const parsedDelayBetweenActions = parseOptionalNumber(delayBetweenActions);
    if (delayBetweenActions.trim() && parsedDelayBetweenActions === null) {
      setErrorMessage("Delay between actions must be a valid number.");
      return;
    }

    createLinkedinCampaign.mutate(
      {
        name: trimmedName,
        company_id: resolvedCompanyId,
        description: description.trim() || undefined,
        daily_limit: parsedDailyLimit ?? undefined,
        delay_between_actions: parsedDelayBetweenActions ?? undefined,
      },
      {
        onSuccess: (campaign) => {
          onClose();
          router.push(`/campaigns/${campaign.id}?channel=linkedin`);
        },
        onError: () => {
          setErrorMessage("Failed to create LinkedIn campaign.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl p-5">
        <DialogHeader className="px-0 pt-0">
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>Choose channel and configure campaign details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={cn(
                "rounded-lg border-2 p-6 text-left transition-colors",
                channel === "email"
                  ? "border-blue-500 bg-blue-500/5"
                  : "border-zinc-700 hover:border-zinc-600"
              )}
            >
              <Mail className="h-5 w-5 text-blue-400" />
              <p className="mt-3 text-sm font-semibold text-white">Email Campaign</p>
            </button>
            <button
              type="button"
              onClick={() => setChannel("linkedin")}
              className={cn(
                "rounded-lg border-2 p-6 text-left transition-colors",
                channel === "linkedin"
                  ? "border-blue-500 bg-blue-500/5"
                  : "border-zinc-700 hover:border-zinc-600"
              )}
            >
              <Linkedin className="h-5 w-5 text-blue-400" />
              <p className="mt-3 text-sm font-semibold text-white">LinkedIn Campaign</p>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Q2 outbound follow-up"
              disabled={isPending}
            />
          </div>

          {isOrgAdmin && (
            <div className="space-y-2">
              <Label htmlFor="campaign-company">Company (optional)</Label>
              <Select
                id="campaign-company"
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                disabled={isPending}
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

          {channel === "linkedin" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="linkedin-description">Description (optional)</Label>
                <Textarea
                  id="linkedin-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe your LinkedIn campaign goal..."
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedin-daily-limit">Daily Limit (optional)</Label>
                  <Input
                    id="linkedin-daily-limit"
                    type="number"
                    min={0}
                    value={dailyLimit}
                    onChange={(event) => setDailyLimit(event.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin-delay">Delay Between Actions (optional)</Label>
                  <Input
                    id="linkedin-delay"
                    type="number"
                    min={0}
                    value={delayBetweenActions}
                    onChange={(event) => setDelayBetweenActions(event.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </>
          )}

          {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
          {(createCampaign.error || createLinkedinCampaign.error) && !errorMessage && (
            <p className="text-sm text-red-400">Campaign creation failed. Try again.</p>
          )}
        </div>

        <DialogFooter className="px-0 pb-0 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

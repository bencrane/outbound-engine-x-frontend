"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization, useUpdateOrganization } from "@/features/settings/api";
import { formatDate } from "@/lib/format";

interface SettingsGeneralTabProps {
  canManage: boolean;
}

export function SettingsGeneralTab({ canManage }: SettingsGeneralTabProps) {
  const { data: organizations = [], isLoading, error } = useOrganization();
  const updateOrganization = useUpdateOrganization();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const organization = organizations[0];
  const name = nameDraft ?? organization?.name ?? "";

  if (error) {
    return <p className="text-sm text-red-400">Failed to load organization settings.</p>;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-10 w-72" />
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return <p className="text-sm text-zinc-400">No organization found.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <form
            className="max-w-md space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setSuccessMessage("");
              updateOrganization.mutate(
                { orgId: organization.id, body: { name } },
                {
                  onSuccess: () => {
                    setNameDraft(null);
                    setSuccessMessage("Organization updated successfully.");
                  },
                }
              );
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(event) => setNameDraft(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1 text-sm text-zinc-400">
              <p>Slug: {organization.slug}</p>
              <p>Created: {formatDate(organization.created_at)}</p>
            </div>
            <Button type="submit" disabled={updateOrganization.isPending}>
              {updateOrganization.isPending ? "Saving..." : "Save"}
            </Button>
            {updateOrganization.error && (
              <p className="text-sm text-red-400">Failed to update organization.</p>
            )}
            {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
          </form>
        ) : (
          <div className="space-y-1 text-sm text-zinc-300">
            <p>Name: {organization.name}</p>
            <p>Slug: {organization.slug}</p>
            <p>Created: {formatDate(organization.created_at)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

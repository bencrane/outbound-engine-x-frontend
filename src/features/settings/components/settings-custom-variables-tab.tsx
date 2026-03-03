"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateCustomVariable, useCustomVariables } from "@/features/tags/api";

export function SettingsCustomVariablesTab() {
  const { data: rawVariables = [], isLoading, error } = useCustomVariables();
  const createCustomVariable = useCreateCustomVariable();

  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const variables = useMemo(() => normalizeVariables(rawVariables), [rawVariables]);

  if (error) {
    return <p className="text-sm text-red-400">Failed to load custom variables.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        These variables can be used in email sequences as {"{{variable_name}}"} placeholders.
      </p>

      <form
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSuccessMessage("");
          createCustomVariable.mutate(
            { name: name.trim() },
            {
              onSuccess: () => {
                setName("");
                setSuccessMessage("Custom variable created.");
              },
            }
          );
        }}
      >
        <h3 className="text-sm font-semibold text-white">Create Variable</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1 space-y-2">
            <Label htmlFor="custom-variable-name">Name</Label>
            <Input
              id="custom-variable-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="company_size"
              required
            />
          </div>
          <Button type="submit" disabled={createCustomVariable.isPending || !name.trim()}>
            {createCustomVariable.isPending ? "Creating..." : "Create Variable"}
          </Button>
        </div>
        {createCustomVariable.error && (
          <p className="text-sm text-red-400">Failed to create custom variable.</p>
        )}
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-8 w-full" />
          ))}
        </div>
      ) : variables.length === 0 ? (
        <p className="text-sm text-zinc-400">No custom variables found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <ul className="divide-y divide-zinc-800">
            {variables.map((variable) => (
              <li key={variable.id} className="px-3 py-2">
                <span className="font-mono text-blue-400">{"{{"}{variable.name}{"}}"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
    </div>
  );
}

function normalizeVariables(input: Record<string, unknown>[]) {
  return input
    .map((value) => {
      const idValue = value.id;
      const name = typeof value.name === "string" ? value.name : "";
      const id =
        typeof idValue === "string" || typeof idValue === "number"
          ? String(idValue)
          : undefined;
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((value): value is { id: string; name: string } => value !== null);
}

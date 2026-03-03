"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreateToken, useRevokeToken, useTokens } from "@/features/settings/api";
import { formatDate, formatRelativeTime } from "@/lib/format";

export function SettingsApiTokensTab() {
  const { data: tokens = [], isLoading, error } = useTokens();
  const createToken = useCreateToken();
  const revokeToken = useRevokeToken();

  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [newToken, setNewToken] = useState("");

  if (error) {
    return <p className="text-sm text-red-400">Failed to load API tokens.</p>;
  }

  return (
    <div className="space-y-6">
      <form
        className="max-w-md space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setNewToken("");
          createToken.mutate(
            {
              name: name || undefined,
              expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
            },
            {
              onSuccess: (data) => {
                setNewToken(data.token);
                setName("");
                setExpiresAt("");
              },
            }
          );
        }}
      >
        <h3 className="text-sm font-semibold text-white">Create Token</h3>
        <div className="space-y-2">
          <Label htmlFor="token-name">Name</Label>
          <Input
            id="token-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My integration token"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token-expires">Expires At</Label>
          <Input
            id="token-expires"
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={createToken.isPending}>
          {createToken.isPending ? "Creating..." : "Create Token"}
        </Button>
        {createToken.error && <p className="text-sm text-red-400">Failed to create token.</p>}
      </form>

      {newToken && (
        <div className="max-w-2xl space-y-2">
          <p className="text-sm text-emerald-400">
            Token created. Copy it now - you won&apos;t be able to see it again.
          </p>
          <div className="rounded-md border border-zinc-700 bg-zinc-800 p-3 font-mono text-sm text-zinc-100">
            {newToken}
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(newToken);
            }}
          >
            Copy
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-8 w-full" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-zinc-400">No API tokens found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>{token.name || "Unnamed token"}</TableCell>
                  <TableCell>{formatDate(token.created_at)}</TableCell>
                  <TableCell>{token.expires_at ? formatDate(token.expires_at) : "Never"}</TableCell>
                  <TableCell>
                    {token.last_used_at ? formatRelativeTime(token.last_used_at) : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("Revoke this token?")) {
                          revokeToken.mutate(token.id);
                        }
                      }}
                      disabled={revokeToken.isPending}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {revokeToken.error && (
        <p className="text-sm text-red-400">Failed to revoke token.</p>
      )}
    </div>
  );
}

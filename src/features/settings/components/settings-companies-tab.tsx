"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useEntitlements,
  useUpdateCompany,
} from "@/features/settings/api";
import { formatDate } from "@/lib/format";

type EditableCompany = {
  id: string;
  name: string;
  domain: string;
  status: string;
};

export function SettingsCompaniesTab() {
  const { data: companies = [], isLoading: companiesLoading, error: companiesError } = useCompanies();
  const {
    data: entitlements = [],
    isLoading: entitlementsLoading,
    error: entitlementsError,
  } = useEntitlements();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [editing, setEditing] = useState<EditableCompany | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies]
  );

  if (companiesError) {
    return <p className="text-sm text-red-400">Failed to load companies.</p>;
  }

  return (
    <div className="space-y-6">
      <form
        className="max-w-3xl space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSuccessMessage("");
          createCompany.mutate(
            { name: name.trim(), domain: domain.trim() || undefined },
            {
              onSuccess: () => {
                setName("");
                setDomain("");
                setSuccessMessage("Company created.");
              },
            }
          );
        }}
      >
        <h3 className="text-sm font-semibold text-white">Create Company</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company-name">Name</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-domain">Domain</Label>
            <Input
              id="company-domain"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="acme.com"
            />
          </div>
        </div>
        <Button type="submit" disabled={createCompany.isPending || !name.trim()}>
          {createCompany.isPending ? "Creating..." : "Create Company"}
        </Button>
        {createCompany.error && <p className="text-sm text-red-400">Failed to create company.</p>}
        {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        {companiesLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-8 w-full" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <p className="p-4 text-sm text-zinc-400">No companies found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => {
                const isEditing = editing?.id === company.id;
                if (isEditing && editing) {
                  return (
                    <TableRow key={company.id}>
                      <TableCell>
                        <Input
                          value={editing.name}
                          onChange={(event) =>
                            setEditing((current) =>
                              current ? { ...current, name: event.target.value } : current
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editing.domain}
                          onChange={(event) =>
                            setEditing((current) =>
                              current ? { ...current, domain: event.target.value } : current
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editing.status}
                          onChange={(event) =>
                            setEditing((current) =>
                              current ? { ...current, status: event.target.value } : current
                            )
                          }
                        >
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                          <option value="paused">paused</option>
                        </Select>
                      </TableCell>
                      <TableCell>{formatDate(company.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={updateCompany.isPending || !editing.name.trim()}
                            onClick={() => {
                              setSuccessMessage("");
                              updateCompany.mutate(
                                {
                                  companyId: editing.id,
                                  body: {
                                    name: editing.name.trim(),
                                    domain: editing.domain.trim() || undefined,
                                    status: editing.status || undefined,
                                  },
                                },
                                {
                                  onSuccess: () => {
                                    setEditing(null);
                                    setSuccessMessage("Company updated.");
                                  },
                                }
                              );
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={updateCompany.isPending}
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={company.id}>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.domain ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={company.status === "active" ? "success" : "secondary"}>
                        {company.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(company.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="secondary">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              setEditing({
                                id: company.id,
                                name: company.name,
                                domain: company.domain ?? "",
                                status: company.status,
                              })
                            }
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-300 hover:text-red-200"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "Delete this company? If it has active campaigns the API may reject this."
                                )
                              ) {
                                return;
                              }
                              setSuccessMessage("");
                              deleteCompany.mutate(company.id, {
                                onSuccess: () => setSuccessMessage("Company deleted."),
                              });
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {(updateCompany.error || deleteCompany.error) && (
        <p className="text-sm text-red-400">Failed to apply company update.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Entitlements</CardTitle>
        </CardHeader>
        <CardContent>
          {entitlementsError ? (
            <p className="text-sm text-red-400">Failed to load entitlements.</p>
          ) : entitlementsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-8 w-full" />
              ))}
            </div>
          ) : entitlements.length === 0 ? (
            <p className="text-sm text-zinc-400">No entitlements found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Capability</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entitlements.map((entitlement) => (
                    <TableRow key={entitlement.id}>
                      <TableCell>{companyMap.get(entitlement.company_id) ?? entitlement.company_id}</TableCell>
                      <TableCell>{entitlement.capability_id}</TableCell>
                      <TableCell>{entitlement.provider_id}</TableCell>
                      <TableCell>
                        <Badge
                          variant={entitlement.status === "active" ? "success" : "secondary"}
                        >
                          {entitlement.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

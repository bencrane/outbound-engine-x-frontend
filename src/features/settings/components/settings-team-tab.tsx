"use client";

import { useMemo, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import {
  useCompanies,
  useCreateUser,
  useDeleteUser,
  useUsers,
} from "@/features/settings/api";
import { useUpdateUser } from "@/features/settings/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const roleOptions = ["org_admin", "company_admin", "company_member"] as const;
type RoleOption = (typeof roleOptions)[number];

export function SettingsTeamTab() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameFirst, setNameFirst] = useState("");
  const [nameLast, setNameLast] = useState("");
  const [role, setRole] = useState<RoleOption>("company_member");
  const [companyId, setCompanyId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies]
  );

  if (usersError) {
    return <p className="text-sm text-red-400">Failed to load team settings.</p>;
  }

  return (
    <div className="space-y-6">
      <form
        className="max-w-4xl space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSuccessMessage("");
          createUser.mutate(
            {
              email,
              password,
              role,
              company_id: companyId || undefined,
              name_first: nameFirst || undefined,
              name_last: nameLast || undefined,
            },
            {
              onSuccess: () => {
                setEmail("");
                setPassword("");
                setNameFirst("");
                setNameLast("");
                setRole("company_member");
                setCompanyId("");
                setSuccessMessage("User created successfully.");
              },
            }
          );
        }}
      >
        <h3 className="text-sm font-semibold text-white">Invite User</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(event) => setRole(event.target.value as RoleOption)}>
              {roleOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="First Name">
            <Input value={nameFirst} onChange={(event) => setNameFirst(event.target.value)} />
          </Field>
          <Field label="Last Name">
            <Input value={nameLast} onChange={(event) => setNameLast(event.target.value)} />
          </Field>
          <Field label="Company">
            <Select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              disabled={companiesLoading}
            >
              <option value="">No company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button type="submit" disabled={createUser.isPending}>
          {createUser.isPending ? "Creating..." : "Create User"}
        </Button>
        {createUser.error && <p className="text-sm text-red-400">Failed to create user.</p>}
        {successMessage && <p className="text-sm text-emerald-400">{successMessage}</p>}
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        {usersLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-8 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="p-4 text-sm text-zinc-400">No users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const name = `${user.name_first ?? ""} ${user.name_last ?? ""}`.trim() || "-";
                const isSelf = currentUser?.user_id === user.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell>{name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{roleBadge(user.role)}</TableCell>
                    <TableCell>{user.company_id ? companyMap.get(user.company_id) ?? "-" : "-"}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="secondary">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {roleOptions.map((nextRole) => (
                            <DropdownMenuItem
                              key={`${user.id}-${nextRole}`}
                              onClick={() =>
                                updateUser.mutate({
                                  userId: user.id,
                                  body: { role: nextRole },
                                })
                              }
                              disabled={nextRole === user.role}
                            >
                              Set role: {nextRole}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem
                            className="text-red-300 hover:text-red-200"
                            disabled={isSelf}
                            onClick={() => {
                              if (isSelf) return;
                              if (window.confirm("Delete this user?")) {
                                deleteUser.mutate(user.id);
                              }
                            }}
                          >
                            {isSelf ? "Cannot delete yourself" : "Delete user"}
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

      {(updateUser.error || deleteUser.error) && (
        <p className="text-sm text-red-400">Failed to apply user update.</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function roleBadge(role: string) {
  if (role === "org_admin") return <Badge variant="default">org_admin</Badge>;
  if (role === "company_admin") return <Badge variant="secondary">company_admin</Badge>;
  return <Badge variant="outline">company_member</Badge>;
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import { hasPermission, isRole, type Permission } from "@/lib/permissions";

interface RouteGuardProps {
  permission: Permission;
  children: ReactNode;
}

function getDefaultLandingPath(role: string | undefined): string {
  return role === "company_member" ? "/inbox" : "/dashboard";
}

export function RouteGuard({ permission, children }: RouteGuardProps) {
  const { user } = useAuth();

  const role = user?.role;
  const hasAccess = role && isRole(role) ? hasPermission(role, permission) : false;
  const fallbackPath = getDefaultLandingPath(role);

  if (!hasAccess) {
    return (
      <div className="p-8">
        <div className="max-w-xl rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-xl font-semibold text-white">Access denied</h1>
          <p className="mt-2 text-zinc-400">You don&apos;t have access to this page.</p>
          <Link
            href={fallbackPath}
            className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

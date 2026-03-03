"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import { hasPermission, isRole, type Permission } from "@/lib/permissions";

interface GateProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  if (!user || !isRole(user.role)) {
    return false;
  }
  return hasPermission(user.role, permission);
}

export function Gate({ permission, children, fallback = null }: GateProps) {
  const allowed = usePermission(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

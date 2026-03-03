"use client";

import type { LucideIcon } from "lucide-react";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Phone,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useCompanyContext } from "@/lib/company-context";
import { hasPermission, isRole, type Permission } from "@/lib/permissions";

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    icon: Megaphone,
    permission: "campaigns.list",
  },
  { name: "Inbox", href: "/inbox", icon: Inbox, permission: "inbox.view" },
  { name: "Leads", href: "/leads", icon: Users, permission: "leads.list" },
  {
    name: "Direct Mail",
    href: "/direct-mail",
    icon: Mail,
    permission: "direct-mail.view",
  },
  {
    name: "VoiceDrop",
    href: "/voicedrop",
    icon: Phone,
    permission: "voicedrop.view",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "settings.view",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { selectedCompanyId, setSelectedCompanyId, companies, isLoading } = useCompanyContext();
  const resolvedRole = user?.role;
  const isOrgAdmin = resolvedRole === "org_admin";
  const visibleNavigation = resolvedRole && isRole(resolvedRole)
    ? navigation.filter((item) => hasPermission(resolvedRole, item.permission))
    : [];

  return (
    <div className="flex h-screen w-60 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <span className="text-lg font-semibold text-white">Outbound Engine</span>
      </div>

      {isOrgAdmin && (
        <div className="border-b border-zinc-800 px-3 py-3">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">Client</p>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select
              value={selectedCompanyId ?? ""}
              onChange={(event) => setSelectedCompanyId(event.target.value || null)}
              className={selectedCompanyId ? "text-white" : "text-zinc-400"}
              aria-label="Select client company context"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-2 py-4">
        {visibleNavigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-2">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

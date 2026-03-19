"use client";

import { useMemo, useState } from "react";
import { RouteGuard } from "@/components/route-guard";
import { useAuth } from "@/lib/auth-context";
import { useCompanyContext } from "@/lib/company-context";
import { formatNumber } from "@/lib/format";

import { useTAMCompanies, useTAMPeople } from "@/features/tam/api";
import { TAMCompaniesTable, type TAMCompanySortField, type SortDirection } from "@/features/tam/components/tam-companies-table";
import { TAMExploreTab } from "@/features/tam/components/tam-explore-tab";
import { TAMPeopleTable } from "@/features/tam/components/tam-people-table";

type ViewTab = "companies" | "people" | "explore";

export default function TAMPage() {
  const { user } = useAuth();
  const { selectedCompanyId, selectedCompany } = useCompanyContext();
  const [viewTab, setViewTab] = useState<ViewTab>("companies");

  // Companies state
  const [companySortField, setCompanySortField] = useState<TAMCompanySortField>("updated");
  const [companySortDirection, setCompanySortDirection] = useState<SortDirection>("desc");

  // Fetch data
  const {
    companies,
    isLoading: companiesLoading,
    error: companiesError,
  } = useTAMCompanies(selectedCompanyId);

  const {
    people,
    isLoading: peopleLoading,
    error: peopleError,
  } = useTAMPeople(selectedCompanyId);

  // Sorting for companies (client side sorting as placeholder until API details)
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const direction = companySortDirection === "asc" ? 1 : -1;
      if (companySortField === "updated") {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
      }
      if (companySortField === "name") {
        return (a.canonical_name || "").localeCompare(b.canonical_name || "") * direction;
      }
      if (companySortField === "domain") {
        return (a.canonical_domain || "").localeCompare(b.canonical_domain || "") * direction;
      }
      if (companySortField === "industry") {
        return (a.industry || "").localeCompare(b.industry || "") * direction;
      }
      return 0;
    });
  }, [companies, companySortField, companySortDirection]);

  return (
    <RouteGuard permission="tam.view">
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">Total Addressable Market</h1>
        <p className="mt-1 text-zinc-400">
          {viewTab === "explore"
            ? "Filter the universe and preview a segment before you export."
            : "View companies and people in the database"}
        </p>
        {user?.company_id === null && (
          <p className="mt-0.5 text-sm text-zinc-500">
            Viewing: {selectedCompany?.name ?? "All Companies"}
          </p>
        )}

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-x-1 gap-y-0 border-b border-zinc-800">
          <button
            type="button"
            onClick={() => setViewTab("companies")}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              viewTab === "companies"
                ? "border-b-2 border-white text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Companies
          </button>
          <button
            type="button"
            onClick={() => setViewTab("people")}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              viewTab === "people"
                ? "border-b-2 border-white text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            People
          </button>
          <button
            type="button"
            onClick={() => setViewTab("explore")}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              viewTab === "explore"
                ? "border-b-2 border-white text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Explore
          </button>
        </div>

        <div className="mt-6">
          {viewTab === "companies" ? (
            <>
              <p className="mb-4 text-sm text-zinc-400">
                Showing {formatNumber(sortedCompanies.length)} companies
              </p>
              <TAMCompaniesTable
                companies={sortedCompanies}
                isLoading={companiesLoading}
                error={companiesError}
                sortField={companySortField}
                sortDirection={companySortDirection}
                onSortChange={(field) => {
                  if (field === companySortField) {
                    setCompanySortDirection((current) => (current === "asc" ? "desc" : "asc"));
                    return;
                  }
                  setCompanySortField(field);
                  setCompanySortDirection(field === "updated" ? "desc" : "asc");
                }}
              />
            </>
          ) : viewTab === "people" ? (
            <>
              <p className="mb-4 text-sm text-zinc-400">
                Showing {formatNumber(people.length)} people
              </p>
              <TAMPeopleTable
                people={people}
                isLoading={peopleLoading}
                error={peopleError}
              />
            </>
          ) : (
            <TAMExploreTab />
          )}
        </div>
      </div>
    </RouteGuard>
  );
}

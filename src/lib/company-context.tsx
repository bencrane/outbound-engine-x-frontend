"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/lib/auth-context";
import { useCompanies, type Company } from "@/lib/hooks";

const STORAGE_KEY = "selectedCompanyId";

interface CompanyContextType {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  selectedCompany: Company | null;
  companies: Company[];
  isLoading: boolean;
}

export interface CompanyFilters {
  company_id?: string;
  all_companies?: boolean;
  mine_only?: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isOrgAdmin = user?.role === "org_admin";
  const { data: fetchedCompanies = [], isLoading: isCompaniesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);

  const companies = isOrgAdmin ? fetchedCompanies : [];

  useEffect(() => {
    if (!isOrgAdmin) {
      setSelectedCompanyIdState(null);
      setHasHydratedSelection(true);
      return;
    }

    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    setSelectedCompanyIdState(storedValue || null);
    setHasHydratedSelection(true);
  }, [isOrgAdmin]);

  useEffect(() => {
    if (!isOrgAdmin || !hasHydratedSelection) {
      return;
    }

    if (selectedCompanyId === null) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, selectedCompanyId);
  }, [hasHydratedSelection, isOrgAdmin, selectedCompanyId]);

  useEffect(() => {
    if (!isOrgAdmin || !hasHydratedSelection || !selectedCompanyId) {
      return;
    }

    const exists = companies.some((company) => company.id === selectedCompanyId);
    if (!exists) {
      setSelectedCompanyIdState(null);
    }
  }, [companies, hasHydratedSelection, isOrgAdmin, selectedCompanyId]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );

  const setSelectedCompanyId = useCallback(
    (id: string | null) => {
      if (!isOrgAdmin) {
        setSelectedCompanyIdState(null);
        return;
      }
      setSelectedCompanyIdState(id);
    },
    [isOrgAdmin]
  );

  const value = useMemo<CompanyContextType>(
    () => ({
      selectedCompanyId: isOrgAdmin ? selectedCompanyId : null,
      setSelectedCompanyId,
      selectedCompany: isOrgAdmin ? selectedCompany : null,
      companies,
      isLoading: isOrgAdmin ? isCompaniesLoading || !hasHydratedSelection : false,
    }),
    [
      companies,
      hasHydratedSelection,
      isCompaniesLoading,
      isOrgAdmin,
      selectedCompany,
      selectedCompanyId,
      setSelectedCompanyId,
    ]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanyContext(): CompanyContextType {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompanyContext must be used within a CompanyProvider");
  }
  return context;
}

export function useCompanyFilters(): CompanyFilters {
  const { user } = useAuth();
  const { selectedCompanyId } = useCompanyContext();

  if (user?.role !== "org_admin") {
    return {};
  }

  if (selectedCompanyId === null) {
    return {
      all_companies: true,
      mine_only: false,
    };
  }

  return {
    company_id: selectedCompanyId,
    mine_only: false,
  };
}

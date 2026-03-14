import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/api";

// Assuming typical REST response formats. 
export interface TAMCompany {
  org_id?: string;
  company_id: string;
  entity_id: string;
  canonical_domain?: string | null;
  canonical_name?: string | null;
  linkedin_url?: string | null;
  industry?: string | null;
  employee_count?: number | null;
  employee_range?: string | null;
  revenue_band?: string | null;
  hq_country?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TAMPerson {
  org_id?: string;
  company_id: string;
  entity_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  linkedin_url?: string | null;
  title?: string | null;
  seniority?: string | null;
  department?: string | null;
  work_email?: string | null;
  created_at: string;
  updated_at: string;
}

export function useTAMCompanies(companyId?: string | null) {
  const query = useQuery({
    queryKey: ["tam", "companies", companyId],
    queryFn: async (): Promise<TAMCompany[]> => {
      try {
        const response = await fetch("/api/dataengine/v1/entities/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            companyId ? { company_id: companyId } : {}
          ),
        });
        
        if (!response.ok) {
          throw new Error(`Proxy error: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log("TAM Companies response:", responseData);
        return responseData?.data?.items ?? [];
      } catch (err: any) {
        console.error("TAM API Error:", err);
        throw new Error(err.message || "Failed to fetch companies");
      }
    },
  });

  return {
    companies: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}

export function useTAMPeople(companyId?: string | null) {
  const query = useQuery({
    queryKey: ["tam", "people", companyId],
    queryFn: async (): Promise<TAMPerson[]> => {
      try {
        const response = await fetch("/api/dataengine/v1/entities/persons", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            companyId ? { company_id: companyId } : {}
          ),
        });

        if (!response.ok) {
          throw new Error(`Proxy error: ${response.status}`);
        }

        const responseData = await response.json();
        console.log("TAM Persons response:", responseData);
        return responseData?.data?.items ?? [];
      } catch (err: any) {
        console.error("TAM API Error:", err);
        throw new Error(err.message || "Failed to fetch persons");
      }
    },
  });

  return {
    people: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}

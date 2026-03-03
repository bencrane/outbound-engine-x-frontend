import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";

export type Company =
  paths["/api/companies/"]["get"]["responses"][200]["content"]["application/json"][number];

export function useCompanies() {
  return useQuery({
    queryKey: ["settings", "companies"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/companies/");
      if (error) {
        throw new Error("Failed to load companies.");
      }
      return data ?? [];
    },
  });
}

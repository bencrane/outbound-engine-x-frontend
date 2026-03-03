"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AuthProvider } from "@/lib/auth-context";
import { CompanyProvider } from "@/lib/company-context";
import { queryClient } from "@/lib/query-client";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompanyProvider>{children}</CompanyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

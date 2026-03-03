import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { paths } from "@/lib/api-types";

export type PieceType = "postcards" | "letters" | "self-mailers" | "checks";

export type DirectMailPieceListResponse =
  paths["/api/direct-mail/postcards"]["get"]["responses"][200]["content"]["application/json"];
export type DirectMailPieceResponse =
  paths["/api/direct-mail/postcards/{piece_id}"]["get"]["responses"][200]["content"]["application/json"];
export type DirectMailPieceCancelResponse =
  paths["/api/direct-mail/postcards/{piece_id}/cancel"]["post"]["responses"][200]["content"]["application/json"];
export type DirectMailAddressVerificationResponse =
  paths["/api/direct-mail/verify-address/us"]["post"]["responses"][200]["content"]["application/json"];
export type DirectMailAnalyticsResponse =
  paths["/api/analytics/direct-mail"]["get"]["responses"][200]["content"]["application/json"];

export interface DirectMailAnalyticsFilters {
  company_id?: string;
  all_companies?: boolean;
  from_ts?: string;
  to_ts?: string;
}

type DirectMailPieceCreateBody =
  paths["/api/direct-mail/postcards"]["post"]["requestBody"]["content"]["application/json"];
type VerifyAddressBody =
  paths["/api/direct-mail/verify-address/us"]["post"]["requestBody"]["content"]["application/json"];
type BulkVerifyAddressBody =
  paths["/api/direct-mail/verify-address/us/bulk"]["post"]["requestBody"]["content"]["application/json"];

export function useDirectMailPieces(pieceType: PieceType) {
  return useQuery({
    queryKey: ["direct-mail", pieceType, "list"],
    queryFn: async () => {
      const response = await fetchDirectMailList(pieceType);
      if (response.error || !response.data) {
        throw new Error("Failed to fetch direct mail pieces.");
      }
      return response.data;
    },
  });
}

export function useDirectMailPiece(pieceType: PieceType, pieceId: string) {
  return useQuery({
    queryKey: ["direct-mail", pieceType, pieceId],
    enabled: Boolean(pieceId),
    queryFn: async () => {
      const response = await fetchDirectMailPiece(pieceType, pieceId);
      if (response.error || !response.data) {
        throw new Error("Failed to fetch direct mail piece detail.");
      }
      return response.data;
    },
  });
}

export function useCreateDirectMailPiece() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pieceType,
      payload,
      company_id,
      idempotency_key,
      idempotency_location,
    }: {
      pieceType: PieceType;
      payload: Record<string, unknown>;
      company_id?: string;
      idempotency_key?: string;
      idempotency_location?: "header" | "query";
    }) => {
      const body: DirectMailPieceCreateBody = {
        payload,
        company_id,
        idempotency_key,
        idempotency_location: idempotency_location ?? "header",
      };
      const response = await createDirectMailPiece(pieceType, body);
      if (response.error || !response.data) {
        throw new Error("Failed to create direct mail piece.");
      }
      return response.data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["direct-mail", variables.pieceType, "list"],
      });
    },
  });
}

export function useCancelDirectMailPiece() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pieceType,
      pieceId,
    }: {
      pieceType: PieceType;
      pieceId: string;
    }) => {
      const response = await cancelDirectMailPiece(pieceType, pieceId);
      if (response.error || !response.data) {
        throw new Error("Failed to cancel direct mail piece.");
      }
      return response.data;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["direct-mail", variables.pieceType, "list"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["direct-mail", variables.pieceType, variables.pieceId],
        }),
      ]);
    },
  });
}

export function useVerifyAddress() {
  return useMutation({
    mutationFn: async (body: VerifyAddressBody) => {
      const { data, error } = await apiClient.POST("/api/direct-mail/verify-address/us", {
        body,
      });
      if (error || !data) {
        throw new Error("Failed to verify address.");
      }
      return data;
    },
  });
}

export function useBulkVerifyAddresses() {
  return useMutation({
    mutationFn: async (body: BulkVerifyAddressBody) => {
      const { data, error } = await apiClient.POST("/api/direct-mail/verify-address/us/bulk", {
        body,
      });
      if (error || !data) {
        throw new Error("Failed to bulk verify addresses.");
      }
      return data;
    },
  });
}

export function useDirectMailAnalytics(filters?: DirectMailAnalyticsFilters) {
  return useQuery({
    queryKey: ["direct-mail", "analytics", filters ?? {}],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/analytics/direct-mail", {
        params: {
          query: filters,
        },
      });

      if (error || !data) {
        throw new Error("Failed to fetch direct mail analytics.");
      }

      return data;
    },
  });
}

function fetchDirectMailList(pieceType: PieceType) {
  switch (pieceType) {
    case "postcards":
      return apiClient.GET("/api/direct-mail/postcards");
    case "letters":
      return apiClient.GET("/api/direct-mail/letters");
    case "self-mailers":
      return apiClient.GET("/api/direct-mail/self-mailers");
    case "checks":
      return apiClient.GET("/api/direct-mail/checks");
  }
}

function fetchDirectMailPiece(pieceType: PieceType, pieceId: string) {
  switch (pieceType) {
    case "postcards":
      return apiClient.GET("/api/direct-mail/postcards/{piece_id}", {
        params: { path: { piece_id: pieceId } },
      });
    case "letters":
      return apiClient.GET("/api/direct-mail/letters/{piece_id}", {
        params: { path: { piece_id: pieceId } },
      });
    case "self-mailers":
      return apiClient.GET("/api/direct-mail/self-mailers/{piece_id}", {
        params: { path: { piece_id: pieceId } },
      });
    case "checks":
      return apiClient.GET("/api/direct-mail/checks/{piece_id}", {
        params: { path: { piece_id: pieceId } },
      });
  }
}

function createDirectMailPiece(pieceType: PieceType, body: DirectMailPieceCreateBody) {
  switch (pieceType) {
    case "postcards":
      return apiClient.POST("/api/direct-mail/postcards", { body });
    case "letters":
      return apiClient.POST("/api/direct-mail/letters", { body });
    case "self-mailers":
      return apiClient.POST("/api/direct-mail/self-mailers", { body });
    case "checks":
      return apiClient.POST("/api/direct-mail/checks", { body });
  }
}

function cancelDirectMailPiece(pieceType: PieceType, pieceId: string) {
  switch (pieceType) {
    case "postcards":
      return apiClient.POST("/api/direct-mail/postcards/{piece_id}/cancel", {
        params: { path: { piece_id: pieceId } },
      });
    case "letters":
      return apiClient.POST("/api/direct-mail/letters/{piece_id}/cancel", {
        params: { path: { piece_id: pieceId } },
      });
    case "self-mailers":
      return apiClient.POST("/api/direct-mail/self-mailers/{piece_id}/cancel", {
        params: { path: { piece_id: pieceId } },
      });
    case "checks":
      return apiClient.POST("/api/direct-mail/checks/{piece_id}/cancel", {
        params: { path: { piece_id: pieceId } },
      });
  }
}

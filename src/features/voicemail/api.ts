import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

type UntypedApiClient = {
  GET: (
    path: string,
    init?: {
      params?: {
        path?: Record<string, string>;
      };
    }
  ) => Promise<{ data?: unknown; error?: unknown }>;
  POST: (
    path: string,
    init?: {
      params?: {
        path?: Record<string, string>;
      };
      body?: unknown;
    }
  ) => Promise<{ data?: unknown; error?: unknown }>;
  DELETE: (
    path: string,
    init?: {
      params?: {
        path?: Record<string, string>;
      };
    }
  ) => Promise<{ data?: unknown; error?: unknown }>;
};

const untypedApiClient = apiClient as unknown as UntypedApiClient;

export interface SendVoicemailPayload {
  company_id: string;
  to: string;
  from_number: string;
  voice_clone_id?: string;
  script?: string;
  recording_url?: string;
}

export interface VoiceClone {
  id: string;
  display_name?: string;
  recording_url?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface SenderNumber {
  phone_number: string;
  status?: string;
  verified_at?: string | null;
  [key: string]: unknown;
}

export const voicemailQueryKeys = {
  voiceClones: ["voicemail", "voice-clones"] as const,
  senderNumbers: ["voicemail", "sender-numbers"] as const,
  report: (campaignId: string) => ["voicemail", "reports", campaignId] as const,
};

export function useSendVoicemail() {
  return useMutation({
    mutationFn: async (payload: SendVoicemailPayload) => {
      const hasAiVoicePayload = Boolean(payload.voice_clone_id?.trim()) && Boolean(payload.script?.trim());
      const hasRecordingPayload = Boolean(payload.recording_url?.trim());
      if (!hasAiVoicePayload && !hasRecordingPayload) {
        throw new Error(
          "Provide either voice_clone_id + script for AI voice, or recording_url for recording mode."
        );
      }

      const body: SendVoicemailPayload = {
        company_id: payload.company_id,
        to: payload.to,
        from_number: payload.from_number,
        ...(hasAiVoicePayload
          ? {
              voice_clone_id: payload.voice_clone_id?.trim(),
              script: payload.script?.trim(),
            }
          : {}),
        ...(hasRecordingPayload ? { recording_url: payload.recording_url?.trim() } : {}),
      };

      const { data, error } = await untypedApiClient.POST("/api/voicemail/send", { body });
      if (error || !data) {
        throw new Error("Failed to send voicemail.");
      }
      return data;
    },
  });
}

export function useVoiceClones() {
  return useQuery({
    queryKey: voicemailQueryKeys.voiceClones,
    queryFn: async () => {
      const { data, error } = await untypedApiClient.GET("/api/voicemail/voice-clones");
      if (error) {
        throw new Error("Failed to fetch voice clones.");
      }
      return (data ?? []) as VoiceClone[];
    },
  });
}

export function useCreateVoiceClone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { display_name: string; recording_url: string }) => {
      const { data, error } = await untypedApiClient.POST("/api/voicemail/voice-clones", { body });
      if (error || !data) {
        throw new Error("Failed to create voice clone.");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: voicemailQueryKeys.voiceClones });
    },
  });
}

export function useDeleteVoiceClone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ voiceCloneId }: { voiceCloneId: string }) => {
      const { data, error } = await untypedApiClient.DELETE(
        "/api/voicemail/voice-clones/{voice_clone_id}",
        {
          params: {
            path: { voice_clone_id: voiceCloneId },
          },
        }
      );
      if (error) {
        throw new Error("Failed to delete voice clone.");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: voicemailQueryKeys.voiceClones });
    },
  });
}

export function usePreviewVoiceClone() {
  return useMutation({
    mutationFn: async ({ voiceCloneId, script }: { voiceCloneId: string; script: string }) => {
      const { data, error } = await untypedApiClient.POST(
        "/api/voicemail/voice-clones/{voice_clone_id}/preview",
        {
          params: {
            path: { voice_clone_id: voiceCloneId },
          },
          body: { script },
        }
      );
      if (error || !data) {
        throw new Error("Failed to generate voice clone preview.");
      }
      return data;
    },
  });
}

export function useSenderNumbers() {
  return useQuery({
    queryKey: voicemailQueryKeys.senderNumbers,
    queryFn: async () => {
      const { data, error } = await untypedApiClient.GET("/api/voicemail/sender-numbers");
      if (error) {
        throw new Error("Failed to fetch sender numbers.");
      }
      return (data ?? []) as SenderNumber[];
    },
  });
}

export function useStartVerification() {
  return useMutation({
    mutationFn: async (body: { phone_number: string; method: "sms" }) => {
      const { data, error } = await untypedApiClient.POST(
        "/api/voicemail/sender-numbers/verify",
        {
          body,
        }
      );
      if (error || !data) {
        throw new Error("Failed to start number verification.");
      }
      return data;
    },
  });
}

export function useCompleteVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { phone_number: string; code: string }) => {
      const { data, error } = await untypedApiClient.POST(
        "/api/voicemail/sender-numbers/verify-code",
        {
          body,
        }
      );
      if (error || !data) {
        throw new Error("Failed to complete number verification.");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: voicemailQueryKeys.senderNumbers });
    },
  });
}

export function useAddToDnc() {
  return useMutation({
    mutationFn: async (body: { phone: string }) => {
      const { data, error } = await untypedApiClient.POST("/api/voicemail/dnc", { body });
      if (error || !data) {
        throw new Error("Failed to add phone to DNC.");
      }
      return data;
    },
  });
}

export function useCampaignVoicemailReport(campaignId: string) {
  return useQuery({
    queryKey: voicemailQueryKeys.report(campaignId),
    enabled: Boolean(campaignId),
    queryFn: async () => {
      const { data, error } = await untypedApiClient.GET(
        "/api/voicemail/campaigns/{campaign_id}/reports",
        {
          params: {
            path: { campaign_id: campaignId },
          },
        }
      );
      if (error || !data) {
        throw new Error("Failed to fetch campaign voicemail report.");
      }
      return data;
    },
  });
}

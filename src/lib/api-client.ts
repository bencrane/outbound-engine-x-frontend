"use client";

import createClient from "openapi-fetch";

import type { paths } from "@/lib/api-types";
import { clearToken, getToken } from "@/lib/api";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = createClient<paths>({ baseUrl });

apiClient.use({
  async onRequest({ request }) {
    const token = getToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return response;
  },
});

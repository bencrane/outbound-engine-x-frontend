"use client";

import createClient from "openapi-fetch";

import type { paths } from "@/lib/api-types";
import { clearToken, getToken } from "@/lib/api";

const baseUrl = process.env.NEXT_PUBLIC_OEX_API_BASE_URL ?? "http://localhost:8000";

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
    // TEMPORARY: Auth bypass — don't redirect on 401
    return response;
  },
});

const API_BASE = process.env.NEXT_PUBLIC_OEX_API_BASE_URL || 'http://localhost:8000';
const DATAENGINE_API_BASE = process.env.NEXT_PUBLIC_DEX_API_BASE_URL || 'http://localhost:8001';

export interface User {
  user_id: string;
  org_id: string;
  company_id: string | null;
  role: string;
  permissions: string[];
  auth_method: string;
}

export interface UserOrg {
  org_id: string;
  org_name: string;
  role: string;
}

export interface SwitchOrgResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}

interface LocalTokenResponse {
  token?: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

// Data Engine token management
export function getDataEngineToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dataengine_token');
}

export function setDataEngineToken(token: string): void {
  localStorage.setItem('dataengine_token', token);
}

export function clearDataEngineToken(): void {
  localStorage.removeItem('dataengine_token');
}

async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as Record<string, unknown>;
    const detail =
      (typeof data.detail === 'string' && data.detail) ||
      (typeof data.error === 'string' && data.error) ||
      (typeof data.message === 'string' && data.message);
    return detail || fallback;
  } catch {
    return fallback;
  }
}

export async function readTokenFromSessionCookie(): Promise<string | null> {
  const response = await fetch('/api/auth/token', {
    method: 'GET',
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as LocalTokenResponse;
  if (typeof data.token !== 'string' || data.token.length === 0) {
    return null;
  }
  return data.token;
}

export async function login(email: string, password: string): Promise<string> {
  const signInResponse = await fetch('/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (!signInResponse.ok) {
    throw new Error(await parseApiError(signInResponse, 'Login failed'));
  }

  const token = await readTokenFromSessionCookie();
  if (!token) {
    throw new Error('Login succeeded but session token was not available');
  }
  setToken(token);

  const sessionCheckResponse = await fetch('/api/auth/session-check', {
    method: 'GET',
    cache: 'no-store',
  });
  if (!sessionCheckResponse.ok) {
    throw new Error(await parseApiError(sessionCheckResponse, 'Session validation failed'));
  }

  // Keep existing hybrid behavior for Data Engine login.
  try {
    const dataEngineResponse = await fetch(`${DATAENGINE_API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (dataEngineResponse.ok) {
      const dataEngineData = await dataEngineResponse.json();
      if (dataEngineData.access_token) {
        setDataEngineToken(dataEngineData.access_token);
      }
    }
  } catch {
    // Data Engine login failed silently - user can still use main app
    console.warn('Data Engine login failed');
  }

  return token;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getToken();
  if (!token && typeof window !== 'undefined') {
    token = await readTokenFromSessionCookie();
    if (token) {
      setToken(token);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail);
  }

  return response.json();
}

// Data Engine API fetch helper
export async function dataEngineFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getDataEngineToken();

  const response = await fetch(`${DATAENGINE_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail);
  }

  return response.json();
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}

export async function getUserOrgs(): Promise<UserOrg[]> {
  return apiFetch<UserOrg[]>('/api/auth/orgs');
}

export async function switchOrg(orgId: string): Promise<string> {
  const response = await apiFetch<SwitchOrgResponse>('/api/auth/switch-org', {
    method: 'POST',
    body: JSON.stringify({ org_id: orgId }),
  });
  setToken(response.access_token);
  return response.access_token;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    void fetch('/api/auth/logout', {
      method: 'POST',
      cache: 'no-store',
    });
  }
  clearToken();
  clearDataEngineToken();
}

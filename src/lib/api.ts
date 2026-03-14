const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface User {
  user_id: string;
  org_id: string;
  company_id: string | null;
  role: string;
  permissions: string[];
  auth_method: string;
}

export interface LoginResponse {
  access_token: string;
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

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  const { access_token }: LoginResponse = await response.json();
  setToken(access_token);
  return access_token;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

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
  clearToken();
}

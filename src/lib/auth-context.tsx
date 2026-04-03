'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  UserOrg,
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  getUserOrgs,
  switchOrg as apiSwitchOrg,
  getToken,
} from './api';

interface AuthContextType {
  user: User | null;
  orgs: UserOrg[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TEMPORARY: Auth bypass — mock user, no login required
const MOCK_USER: User = {
  user_id: 'dev-bypass',
  org_id: 'dev-org',
  company_id: null,
  role: 'admin',
  permissions: ['*'],
  auth_method: 'bypass',
};

const MOCK_ORGS: UserOrg[] = [
  { org_id: 'dev-org', org_name: 'Dev Org', role: 'admin' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [orgs, setOrgs] = useState<UserOrg[]>(MOCK_ORGS);
  const [isLoading] = useState(false);
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    // bypass: always use mock user
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (_email: string, _password: string) => {
    // bypass: no-op
  }, []);

  const logout = useCallback(() => {
    // bypass: no-op
    queryClient.clear();
  }, [queryClient]);

  const switchOrg = useCallback(async (_orgId: string) => {
    // bypass: no-op
    queryClient.clear();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        orgs,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        switchOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

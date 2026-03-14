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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<UserOrg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setOrgs([]);
      setIsLoading(false);
      return;
    }

    try {
      const [userData, userOrgs] = await Promise.all([
        getCurrentUser(),
        getUserOrgs(),
      ]);
      setUser(userData);
      setOrgs(userOrgs);
    } catch {
      setUser(null);
      setOrgs([]);
      apiLogout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setOrgs([]);
    queryClient.clear();
  }, [queryClient]);

  const switchOrg = useCallback(async (orgId: string) => {
    await apiSwitchOrg(orgId);
    await refreshUser();
    queryClient.clear();
  }, [refreshUser, queryClient]);

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

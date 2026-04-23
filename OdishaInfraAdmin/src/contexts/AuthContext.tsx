import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApi } from '../services/api';

interface AdminUser {
  id: string;
  name: string | null;
  phone?: string;
  email?: string;
  role: 'ADMIN' | 'CUSTOMER' | 'DEVELOPER';
}

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = adminApi.getToken();
    if (!token) { setIsLoading(false); return; }
    adminApi.getMe()
      .then((data: { user: AdminUser }) => {
        if (data.user.role === 'ADMIN') setUser(data.user);
        else { adminApi.setToken(null); }
      })
      .catch(() => adminApi.setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = (token: string, userData: AdminUser) => {
    adminApi.setToken(token);
    setUser(userData);
  };

  const logout = () => {
    adminApi.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "./api";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, passwordConfirmation: string, phone?: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session via cookie-based auth
    api.getUser()
      .then((res) => setUser(res.data || res))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await api.login({ email, password });
    // Cookie is set by the server automatically
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, passwordConfirmation: string, phone?: string): Promise<User> => {
    const res = await api.register({ name, email, password, password_confirmation: passwordConfirmation, phone });
    // Cookie is set by the server automatically
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    // Cookie is cleared by the server
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

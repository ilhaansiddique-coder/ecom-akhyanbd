"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "./api";
import { setTrackingUserId, clearLastCustomer } from "./analytics";

interface User {
  id: string;
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

// Session cache key — stores basic user info so subsequent mounts are instant
const SESSION_KEY = "akh_session_user";

function getCachedUser(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setCachedUser(u: User | null) {
  try {
    if (u) sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = typeof window !== "undefined" ? getCachedUser() : null;
  const [user, setUser] = useState<User | null>(cached);
  // If we have a cached user, start as not loading (instant render)
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    // Always verify with server in background (cache may be stale)
    api.getUser()
      .then((res) => {
        const u = res.data || res;
        setUser(u);
        setCachedUser(u);
        if (u?.id) setTrackingUserId(u.id);
      })
      .catch(() => {
        setUser(null);
        setCachedUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await api.login({ email, password });
    setUser(res.user);
    setCachedUser(res.user);
    if (res.user?.id) setTrackingUserId(res.user.id);
    return res.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, passwordConfirmation: string, phone?: string): Promise<User> => {
    const res = await api.register({ name, email, password, password_confirmation: passwordConfirmation, phone });
    setUser(res.user);
    if (res.user?.id) setTrackingUserId(res.user.id);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    // Cookie is cleared by the server
    setUser(null);
    setCachedUser(null);
    // Wipe per-browser customer cache so next visitor on this device doesn't
    // get tracked as the previous user (shared family devices, public PCs).
    clearLastCustomer();
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

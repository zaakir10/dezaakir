"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest, setClientCsrfToken } from "@/lib/api";
import type { SessionInfo, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  session: SessionInfo | null;
  csrfToken: string | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  setAuthSession: (payload: { user: User; session: SessionInfo; csrfToken: string }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const { data } = await apiRequest<{
        user: User;
        session: SessionInfo;
        csrfToken?: string;
      }>("/api/auth/me");
      setUser(data.user);
      setSession(data.session);
      const token = data.csrfToken ?? null;
      setCsrfToken(token);
      setClientCsrfToken(token);
    } catch {
      setUser(null);
      setSession(null);
      setCsrfToken(null);
      setClientCsrfToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const setAuthSession = useCallback(
    (payload: { user: User; session: SessionInfo; csrfToken: string }) => {
      setUser(payload.user);
      setSession(payload.session);
      setCsrfToken(payload.csrfToken);
      setClientCsrfToken(payload.csrfToken);
      setLoading(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Clear local state regardless
    } finally {
      setUser(null);
      setSession(null);
      setCsrfToken(null);
      setClientCsrfToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, csrfToken, loading, refreshAuth, setAuthSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

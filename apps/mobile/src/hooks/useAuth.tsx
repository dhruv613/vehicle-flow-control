import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { apiLogin, apiLogout, API_BASE_URL, setAuthToken } from "../data/garageRepository";
import { readJson, removeItem, STORAGE_KEYS, writeJson } from "../data/storage";
import type { AuthUser } from "../data/types";

/**
 * The same demo accounts the FastAPI service seeds. They make the sign-in
 * flow fully demonstrable even when no API is configured or reachable.
 */
export const DEMO_ACCOUNTS: (AuthUser & { password: string })[] = [
  { id: "usr_001", username: "admin", password: "garage123", name: "Alex Mercer", role: "Garage owner" },
  { id: "usr_002", username: "mira", password: "garage123", name: "Mira Patel", role: "Service advisor" },
];

type AuthStatus = "restoring" | "signedOut" | "signedIn";
type AuthMode = "api" | "demo";

interface StoredSession {
  token: string | null;
  user: AuthUser;
  expiresAt: string | null;
  mode: AuthMode;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  mode: AuthMode;
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<AuthMode>("demo");

  useEffect(() => {
    void (async () => {
      const session = await readJson<StoredSession>(STORAGE_KEYS.session);
      const expired = session?.expiresAt ? session.expiresAt < new Date().toISOString() : false;
      if (session?.user && !expired) {
        setAuthToken(session.token);
        setUser(session.user);
        setMode(session.mode);
        setStatus("signedIn");
      } else {
        if (session) await removeItem(STORAGE_KEYS.session);
        setStatus("signedOut");
      }
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<string | null> => {
    const cleanUser = username.trim();
    if (cleanUser.length < 2 || password.length < 4) {
      return "Enter your username and password to open the workspace.";
    }
    const result = await apiLogin(cleanUser, password);
    if (result === false) {
      return "That username and password combination was not recognised.";
    }
    if (result) {
      const session: StoredSession = { token: result.token, user: result.user, expiresAt: result.expiresAt, mode: "api" };
      setAuthToken(result.token);
      await writeJson(STORAGE_KEYS.session, session);
      setUser(result.user);
      setMode("api");
      setStatus("signedIn");
      return null;
    }
    // API not configured or unreachable — accept the demo accounts locally so
    // the workspace stays demonstrable offline.
    const account = DEMO_ACCOUNTS.find(
      (candidate) => candidate.username.toLowerCase() === cleanUser.toLowerCase() && candidate.password === password,
    );
    if (!account) {
      return API_BASE_URL
        ? "The garage server is unreachable. Use a demo account to work offline."
        : "That username and password combination was not recognised.";
    }
    const { password: _ignored, ...demoUser } = account;
    const session: StoredSession = { token: null, user: demoUser, expiresAt: null, mode: "demo" };
    setAuthToken(null);
    await writeJson(STORAGE_KEYS.session, session);
    setUser(demoUser);
    setMode("demo");
    setStatus("signedIn");
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setAuthToken(null);
    await removeItem(STORAGE_KEYS.session);
    setUser(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ status, user, mode, signIn, signOut }), [status, user, mode, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used within AuthProvider");
  return auth;
}

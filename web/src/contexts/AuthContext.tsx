import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  DEV_BYPASS_AVAILABLE,
  DEV_USER_EMAIL,
  DEV_USER_ID,
  isDevBypassActive,
  setDevBypass,
} from "../lib/devAuth";

export interface AuthUserView {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: AuthUserView | null;
  session: Session | null;
  loading: boolean;
  /** True when the dev shortcut is *available* in this build (env-gated). */
  devBypassAvailable: boolean;
  /** True when dev shortcut is currently active for this browser. */
  devBypassActive: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDevUser: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toView(user: User): AuthUserView {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? "",
    name:
      (typeof meta.full_name === "string" ? meta.full_name : undefined) ??
      (typeof meta.name === "string" ? meta.name : undefined),
    avatarUrl:
      typeof meta.avatar_url === "string" ? meta.avatar_url : undefined,
  };
}

const DEV_USER_VIEW: AuthUserView = {
  id: DEV_USER_ID,
  email: DEV_USER_EMAIL,
  name: "Dev User",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [devActive, setDevActive] = useState<boolean>(() => isDevBypassActive());
  const [user, setUser] = useState<AuthUserView | null>(
    devActive ? DEV_USER_VIEW : null,
  );
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(!devActive);

  useEffect(() => {
    if (devActive) {
      setUser(DEV_USER_VIEW);
      setSession(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ? toView(data.session.user) : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ? toView(next.user) : null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [devActive]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }, []);

  const signInAsDevUser = useCallback(() => {
    if (!DEV_BYPASS_AVAILABLE) return;
    setDevBypass(true);
    setDevActive(true);
  }, []);

  const signOut = useCallback(async () => {
    if (devActive) {
      // Dev bypass currently active — flip the override off and drop to login.
      setDevBypass(false);
      setDevActive(false);
      setUser(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [devActive]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      devBypassAvailable: DEV_BYPASS_AVAILABLE,
      devBypassActive: devActive,
      signInWithGoogle,
      signInAsDevUser,
      signOut,
    }),
    [
      user,
      session,
      loading,
      devActive,
      signInWithGoogle,
      signInAsDevUser,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

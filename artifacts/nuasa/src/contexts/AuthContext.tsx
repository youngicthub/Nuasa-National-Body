import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  getSession,
  saveSession,
  Session,
  signIn as apiSignIn,
  signOut as clearSession,
  signUp as apiSignUp,
  User,
} from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type AppRole = "admin" | "user";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  institution: string | null;
  academic_level: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: Error | null; role?: AppRole }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: AppRole }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const response = await apiFetch<{ profile: Profile | null; role: AppRole }>("/auth/me");
      setProfile(response.profile ?? null);
      setRole(response.role ?? null);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let currentUserId: string | null = null;

    const applySession = async (nextSession: Session | null, opts: { initial?: boolean } = {}) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      const nextUserId = nextSession?.user?.id ?? null;

      if (!nextUserId) {
        currentUserId = null;
        setProfile(null);
        setRole(null);
        if (opts.initial) setIsLoading(false);
        return;
      }

      // Only refetch profile/role when the user actually changes (sign-in / sign-out),
      // not on routine TOKEN_REFRESHED events — those caused the admin UI to flicker.
      if (nextUserId !== currentUserId) {
        currentUserId = nextUserId;
        await fetchUserData(nextUserId);
      }

      if (opts.initial && isMounted) setIsLoading(false);
    };

    void getSession().then((nextSession) => applySession(nextSession, { initial: true }));
    return () => { isMounted = false; };
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    try {
      const response = await apiSignUp(email, password, metadata);
      if (response.session) {
        saveSession(response.session);
        setSession(response.session);
        setUser(response.session.user);
        await fetchUserData(response.session.user.id);
      }
      return { error: null, role: "user" as AppRole };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiSignIn(email, password);
      if (!response.session) throw new Error("The login service returned an incomplete session.");
      saveSession(response.session);
      setSession(response.session);
      setUser(response.session.user);
      await fetchUserData(response.session.user.id);
      return { error: null, role: response.session.user.user_metadata?.role as AppRole | undefined };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    clearSession();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        isAdmin: role === "admin",
        isLoading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

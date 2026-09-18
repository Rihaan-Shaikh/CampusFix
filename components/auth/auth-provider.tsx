"use client";

import * as React from "react";
import { useSession as useBetterAuthSession, signOut as betterAuthSignOut } from "@/lib/auth-client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AuthSession {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date | string;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };
  user: AuthUser;
}

interface AuthContextType {
  session: AuthSession | null;
  user: AuthUser | null;
  role: string | null;
  isPending: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  isPending: false,
  signOut: async () => {},
});

export function AuthProvider({
  initialSession,
  children,
}: {
  initialSession?: AuthSession | null;
  children: React.ReactNode;
}) {
  const { data: clientSession, isPending: clientPending } = useBetterAuthSession();

  // If clientSession is available, use client state; otherwise use server initialSession
  const session = clientSession !== undefined ? (clientSession as unknown as AuthSession | null) : (initialSession ?? null);
  const user = session?.user ?? null;
  const role = user?.role ?? null;

  // Resolved immediately if server session was provided, avoiding hydration flicker
  const isPending = initialSession ? false : clientPending;

  const handleSignOut = React.useCallback(async () => {
    try {
      await betterAuthSignOut();
    } finally {
      window.location.href = "/sign-in";
    }
  }, []);

  const value = React.useMemo(
    () => ({
      session,
      user,
      role,
      isPending,
      signOut: handleSignOut,
    }),
    [session, user, role, isPending, handleSignOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}

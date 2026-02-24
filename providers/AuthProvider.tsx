import React, { useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { useAuth, useUser } from "@clerk/clerk-expo";

interface AuthState {
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  signOut: () => Promise<void>;
}

export const [AuthProvider, useAuthContext] = createContextHook((): AuthState => {
  const { isSignedIn, isLoaded, userId, signOut: clerkSignOut } = useAuth();
  const { user } = useUser();

  const signOut = useCallback(async () => {
    try {
      await clerkSignOut();
      console.log("[Auth] Signed out successfully");
    } catch (error) {
      console.error("[Auth] Sign out error:", error);
    }
  }, [clerkSignOut]);

  const state = useMemo(
    () => ({
      isSignedIn: isSignedIn ?? false,
      isLoaded: isLoaded ?? false,
      userId: userId ?? null,
      userName: user?.firstName ?? user?.username ?? null,
      userEmail: user?.primaryEmailAddress?.emailAddress ?? null,
      userAvatar: user?.imageUrl ?? null,
      signOut,
    }),
    [isSignedIn, isLoaded, userId, user, signOut]
  );

  return state;
});

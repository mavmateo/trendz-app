import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { tokenCache } from "@/lib/clerk";
import { trpc, trpcClient } from "@/lib/trpc";
import { AuthProvider } from "@/providers/AuthProvider";
import { BookmarkProvider } from "@/providers/BookmarkProvider";
import { LikesProvider } from "@/providers/LikesProvider";
import { CommentsProvider } from "@/providers/CommentsProvider";
import { useDailyScrape } from "@/hooks/useDailyScrape";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  console.warn("[Clerk] Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY - auth will be disabled");
}

function DailyScrapeRunner({ children }: { children: React.ReactNode }) {
  useDailyScrape();
  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="article/[id]"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="sign-in"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const appContent = (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <BookmarkProvider>
              <LikesProvider>
                <CommentsProvider>
                  <DailyScrapeRunner>
                    <StatusBar style="light" />
                    <RootLayoutNav />
                  </DailyScrapeRunner>
                </CommentsProvider>
              </LikesProvider>
            </BookmarkProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );

  if (!clerkPublishableKey) {
    return appContent;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        {appContent}
      </ClerkLoaded>
    </ClerkProvider>
  );
}

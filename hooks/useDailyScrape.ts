import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

const LAST_SCRAPE_KEY = "trendz_last_scrape_timestamp";
const SCRAPE_INTERVAL_MS = 60 * 60 * 1000;
const HOURLY_CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function getLastScrapeTime(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(LAST_SCRAPE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

async function markScrapedNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SCRAPE_KEY, Date.now().toString());
  } catch (error) {
    console.error("[HourlyScrape] Error saving scrape timestamp:", error);
  }
}

export function useDailyScrape() {
  const queryClient = useQueryClient();
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggerScrape = trpc.news.triggerDailyScrape.useMutation();

  const checkAndScrape = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const lastScrape = await getLastScrapeTime();
      const elapsed = Date.now() - lastScrape;

      if (elapsed < SCRAPE_INTERVAL_MS) {
        const minutesLeft = Math.round((SCRAPE_INTERVAL_MS - elapsed) / 60000);
        console.log(`[HourlyScrape] Last scrape was ${Math.round(elapsed / 60000)}m ago, next in ~${minutesLeft}m`);
        isCheckingRef.current = false;
        return;
      }

      console.log("[HourlyScrape] Triggering hourly scrape via tRPC...");

      try {
        const result = await triggerScrape.mutateAsync();
        console.log("[HourlyScrape] Scrape result:", JSON.stringify(result));
        await markScrapedNow();
        queryClient.invalidateQueries({ queryKey: ["articles"] });
        queryClient.invalidateQueries({ queryKey: ["trending"] });
        console.log("[HourlyScrape] Scrape completed and cache invalidated");
      } catch (mutationError: any) {
        console.warn("[HourlyScrape] Scrape request failed, will retry later:", mutationError?.message ?? "Unknown error");
      }
    } catch (error) {
      console.warn("[HourlyScrape] Check error:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [queryClient, triggerScrape]);

  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      checkAndScrape();
    }, 5000);

    intervalRef.current = setInterval(() => {
      console.log("[HourlyScrape] Periodic check triggered");
      checkAndScrape();
    }, HOURLY_CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        setTimeout(() => checkAndScrape(), 2000);
      }
    });

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, [checkAndScrape]);
}

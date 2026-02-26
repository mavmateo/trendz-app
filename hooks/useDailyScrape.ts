import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";

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

function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "";
}

export function useDailyScrape() {
  const queryClient = useQueryClient();
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        console.warn("[HourlyScrape] No API base URL configured, skipping");
        isCheckingRef.current = false;
        return;
      }

      console.log("[HourlyScrape] Triggering hourly scrape via cron endpoint...");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      try {
        const res = await fetch(`${baseUrl}/api/cron/scrape`, {
          method: "POST",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          console.log("[HourlyScrape] Scrape result:", JSON.stringify(data));
          await markScrapedNow();
          queryClient.invalidateQueries({ queryKey: ["articles"] });
          queryClient.invalidateQueries({ queryKey: ["trending"] });
          console.log("[HourlyScrape] Scrape completed and cache invalidated");
        } else {
          const text = await res.text();
          console.error("[HourlyScrape] Scrape failed:", res.status, text);
        }
      } catch (fetchError: any) {
        clearTimeout(timeout);
        if (fetchError.name === "AbortError") {
          console.log("[HourlyScrape] Request timed out, marking as done to avoid retries");
          await markScrapedNow();
          queryClient.invalidateQueries({ queryKey: ["articles"] });
        } else {
          console.error("[HourlyScrape] Fetch error:", fetchError.message);
        }
      }
    } catch (error) {
      console.error("[HourlyScrape] Check error:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [queryClient]);

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

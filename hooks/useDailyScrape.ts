import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";

const LAST_SCRAPE_KEY = "trendz_last_scrape_date";
const SCRAPE_HOUR_UTC = 6;

function getTodayScrapeKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function shouldScrapeNow(): boolean {
  const now = new Date();
  return now.getUTCHours() >= SCRAPE_HOUR_UTC;
}

async function hasScrapedToday(): Promise<boolean> {
  try {
    const lastScrape = await AsyncStorage.getItem(LAST_SCRAPE_KEY);
    const todayKey = getTodayScrapeKey();
    return lastScrape === todayKey;
  } catch {
    return false;
  }
}

async function markScrapedToday(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SCRAPE_KEY, getTodayScrapeKey());
  } catch (error) {
    console.error("[DailyScrape] Error saving scrape date:", error);
  }
}

function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "";
}

export function useDailyScrape() {
  const queryClient = useQueryClient();
  const isCheckingRef = useRef(false);

  const checkAndScrape = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const alreadyScraped = await hasScrapedToday();
      if (alreadyScraped) {
        console.log("[DailyScrape] Already scraped today, skipping");
        isCheckingRef.current = false;
        return;
      }

      if (!shouldScrapeNow()) {
        console.log("[DailyScrape] Not yet 6am UTC, skipping");
        isCheckingRef.current = false;
        return;
      }

      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        console.warn("[DailyScrape] No API base URL configured, skipping");
        isCheckingRef.current = false;
        return;
      }

      console.log("[DailyScrape] Triggering daily scrape via cron endpoint...");

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
          console.log("[DailyScrape] Scrape result:", JSON.stringify(data));
          await markScrapedToday();
          queryClient.invalidateQueries({ queryKey: ["articles"] });
          queryClient.invalidateQueries({ queryKey: ["trending"] });
          console.log("[DailyScrape] Scrape completed and cache invalidated");
        } else {
          const text = await res.text();
          console.error("[DailyScrape] Scrape failed:", res.status, text);
        }
      } catch (fetchError: any) {
        clearTimeout(timeout);
        if (fetchError.name === "AbortError") {
          console.log("[DailyScrape] Request timed out, marking as done to avoid retries");
          await markScrapedToday();
          queryClient.invalidateQueries({ queryKey: ["articles"] });
        } else {
          console.error("[DailyScrape] Fetch error:", fetchError.message);
        }
      }
    } catch (error) {
      console.error("[DailyScrape] Check error:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      checkAndScrape();
    }, 5000);

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        setTimeout(() => checkAndScrape(), 2000);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [checkAndScrape]);
}

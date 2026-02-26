import { useEffect, useRef } from "react";
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

async function triggerScrape(baseUrl: string): Promise<boolean> {
  try {
    console.log("[DailyScrape] Triggering daily scrape...");
    const res = await fetch(`${baseUrl}/api/cron/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.error("[DailyScrape] Scrape failed:", res.status);
      return false;
    }

    const result = await res.json();
    console.log("[DailyScrape] Scrape result:", JSON.stringify(result));
    return true;
  } catch (error) {
    console.error("[DailyScrape] Error triggering scrape:", error);
    return false;
  }
}

export function useDailyScrape() {
  const queryClient = useQueryClient();
  const isCheckingRef = useRef(false);

  const checkAndScrape = async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const alreadyScraped = await hasScrapedToday();
      if (alreadyScraped) {
        console.log("[DailyScrape] Already scraped today, skipping");
        return;
      }

      if (!shouldScrapeNow()) {
        console.log("[DailyScrape] Not yet 6am UTC, skipping");
        return;
      }

      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      if (!baseUrl) {
        console.warn("[DailyScrape] No API base URL configured");
        return;
      }

      const success = await triggerScrape(baseUrl);
      if (success) {
        await markScrapedToday();
        queryClient.invalidateQueries({ queryKey: ["articles"] });
        queryClient.invalidateQueries({ queryKey: ["trending"] });
        console.log("[DailyScrape] Scrape completed and cache invalidated");
      }
    } catch (error) {
      console.error("[DailyScrape] Check error:", error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      checkAndScrape();
    }, 3000);

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        checkAndScrape();
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, []);
}

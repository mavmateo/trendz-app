import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";

const LAST_SCRAPE_KEY = "trendz_last_scrape_date";
const SCRAPE_HOUR_UTC = 6;
const SCRAPE_TIMEOUT_MS = 120000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

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

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fetch(url, { ...options, signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function triggerScrape(baseUrl: string, attempt: number = 1): Promise<boolean> {
  try {
    console.log(`[DailyScrape] Triggering daily scrape (attempt ${attempt})...`);
    console.log(`[DailyScrape] URL: ${baseUrl}/api/cron/scrape`);

    const res = await fetchWithTimeout(
      `${baseUrl}/api/cron/scrape`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      SCRAPE_TIMEOUT_MS
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      console.error(`[DailyScrape] Scrape failed: ${res.status} - ${body}`);
      return false;
    }

    const result = await res.json();
    console.log("[DailyScrape] Scrape result:", JSON.stringify(result));
    return true;
  } catch (error: any) {
    console.error(`[DailyScrape] Error on attempt ${attempt}:`, error?.message || error);

    if (attempt < MAX_RETRIES) {
      console.log(`[DailyScrape] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return triggerScrape(baseUrl, attempt + 1);
    }

    console.error("[DailyScrape] All retry attempts exhausted");
    return false;
  }
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

      console.log(`[DailyScrape] Base URL: ${baseUrl}`);
      console.log(`[DailyScrape] Platform: ${Platform.OS}`);

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

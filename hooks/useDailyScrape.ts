import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";

const LAST_SCRAPE_KEY = "trendz_last_scrape_timestamp"; // renamed — now stores a timestamp, not just a date
const SCRAPE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Bug Fix 1: Was storing only a date string (YYYY-MM-DD), which meant the
// scrape was blocked for the entire day after the first run.
// Now stores a full Unix timestamp so we can check if an hour has passed.
async function getLastScrapeTimestamp(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(LAST_SCRAPE_KEY);
    if (!stored) return 0;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

async function markScrapeTimestamp(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SCRAPE_KEY, Date.now().toString());
  } catch (error) {
    console.error("[HourlyScrape] Error saving scrape timestamp:", error);
  }
}

// Bug Fix 2: Removed the UTC hour gate (was: now.getUTCHours() >= 6).
// That gate was an additional blocker — there's no reason to restrict
// hourly refreshes to only after 6am UTC. Fresh news should load anytime.
async function shouldScrapeNow(): Promise<boolean> {
  const lastScrape = await getLastScrapeTimestamp();
  const elapsed = Date.now() - lastScrape;
  const due = elapsed >= SCRAPE_INTERVAL_MS;
  console.log(
    `[HourlyScrape] Last scrape: ${lastScrape ? new Date(lastScrape).toISOString() : "never"}, ` +
    `Elapsed: ${Math.floor(elapsed / 60000)}min, Due: ${due}`
  );
  return due;
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
      const due = await shouldScrapeNow();
      if (!due) {
        console.log("[HourlyScrape] Not yet due, skipping");
        isCheckingRef.current = false;
        return;
      }

      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        console.warn("[HourlyScrape] No API base URL configured, skipping");
        isCheckingRef.current = false;
        return;
      }

      console.log("[HourlyScrape] Triggering hourly scrape...");

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
          // Mark timestamp immediately after a successful scrape
          await markScrapeTimestamp();
          queryClient.invalidateQueries({ queryKey: ["articles"] });
          queryClient.invalidateQueries({ queryKey: ["trending"] });
          console.log("[HourlyScrape] Cache invalidated, fresh news loading");
        } else {
          const text = await res.text();
          console.error("[HourlyScrape] Scrape failed:", res.status, text);
          // Do NOT update timestamp on failure — allow retry on next interval
        }
      } catch (fetchError: any) {
        clearTimeout(timeout);
        if (fetchError.name === "AbortError") {
          console.log("[HourlyScrape] Request timed out");
          // On timeout, still mark as done to avoid hammering the server
          await markScrapeTimestamp();
          queryClient.invalidateQueries({ queryKey: ["articles"] });
        } else {
          console.error("[HourlyScrape] Fetch error:", fetchError.message);
          // Network error — do NOT update timestamp, allow retry next interval
        }
      }
    } catch (error) {
      console.error("[HourlyScrape] Unexpected error:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    // Initial check after 3 seconds on mount
    const initialTimeout = setTimeout(() => {
      checkAndScrape();
    }, 3000);

    // Bug Fix 3: Added a recurring interval that fires every hour while the
    // app is open. Previously there was NO interval — only a one-time timeout
    // and an AppState listener. An app left open in the foreground would never
    // refresh after the initial load.
    const hourlyInterval = setInterval(() => {
      console.log("[HourlyScrape] Hourly interval fired");
      checkAndScrape();
    }, SCRAPE_INTERVAL_MS);

    // AppState listener still handles the case where the app was backgrounded
    // and brought back to the foreground after more than an hour
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        console.log("[HourlyScrape] App foregrounded, checking if scrape due");
        setTimeout(() => checkAndScrape(), 2000);
      }
    });

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(hourlyInterval); // clean up interval on unmount
      subscription.remove();
    };
  }, [checkAndScrape]);
}
import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";

const LAST_SCRAPE_KEY = "trendz_last_scrape_timestamp";
const SCRAPE_INTERVAL_MS = 60 * 60 * 1000;

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

export function useDailyScrape() {
  const queryClient = useQueryClient();
  const isCheckingRef = useRef(false);
  const utils = trpc.useUtils();

  const scrapeMutation = trpc.news.scrapeAll.useMutation({
    onSuccess: async (data) => {
      console.log("[HourlyScrape] Scrape result:", JSON.stringify(data));
      await markScrapeTimestamp();
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["trending"] });
      console.log("[HourlyScrape] Cache invalidated, fresh news loading");
    },
    onError: (error) => {
      console.error("[HourlyScrape] Scrape mutation error:", error.message);
    },
  });

  const checkAndScrape = useCallback(async () => {
    if (isCheckingRef.current || scrapeMutation.isPending) return;
    isCheckingRef.current = true;

    try {
      const due = await shouldScrapeNow();
      if (!due) {
        console.log("[HourlyScrape] Not yet due, skipping");
        return;
      }

      console.log("[HourlyScrape] Triggering hourly scrape via tRPC...");
      scrapeMutation.mutate();
    } catch (error) {
      console.error("[HourlyScrape] Unexpected error:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [scrapeMutation]);

  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      checkAndScrape();
    }, 3000);

    const hourlyInterval = setInterval(() => {
      console.log("[HourlyScrape] Hourly interval fired");
      checkAndScrape();
    }, SCRAPE_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        console.log("[HourlyScrape] App foregrounded, checking if scrape due");
        setTimeout(() => checkAndScrape(), 2000);
      }
    });

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(hourlyInterval);
      subscription.remove();
    };
  }, [checkAndScrape]);
}
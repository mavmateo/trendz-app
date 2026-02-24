import { useQuery } from "@tanstack/react-query";
import { supabase, DbArticle } from "@/lib/supabase";
import { NewsArticle, NewsCategory } from "@/types/news";
import { mockArticles as fallbackArticles } from "@/mocks/news";

function dbToNewsArticle(db: DbArticle): NewsArticle {
  const now = new Date();
  const published = new Date(db.published_at);
  const diffMs = now.getTime() - published.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);

  let publishedAt: string;
  if (diffHours < 1) publishedAt = "Just now";
  else if (diffHours < 24) publishedAt = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  else if (diffDays < 7) publishedAt = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  else publishedAt = published.toLocaleDateString();

  return {
    id: db.id,
    title: db.title,
    summary: db.summary,
    body: db.body,
    category: db.category as NewsCategory,
    source: db.source,
    sourceIcon: db.source_icon,
    author: db.author,
    imageUrl: db.image_url,
    publishedAt: publishedAt,
    readTime: db.read_time,
    tags: db.tags ?? [],
    likes: db.likes,
    comments: db.comments,
    shares: db.shares,
  };
}

async function fetchArticles(category?: NewsCategory): Promise<NewsArticle[]> {
  try {
    let query = supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(50);

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("[useNews] Supabase error (using fallback):", error.message);
      if (category && category !== "all") {
        return fallbackArticles.filter((a) => a.category === category);
      }
      return fallbackArticles;
    }

    if (!data || data.length === 0) {
      console.log("[useNews] No articles in Supabase, using fallback data");
      if (category && category !== "all") {
        return fallbackArticles.filter((a) => a.category === category);
      }
      return fallbackArticles;
    }

    console.log(`[useNews] Fetched ${data.length} articles from Supabase`);
    return (data as DbArticle[]).map(dbToNewsArticle);
  } catch (error) {
    console.warn("[useNews] Falling back to mock data:", error);
    if (category && category !== "all") {
      return fallbackArticles.filter((a) => a.category === category);
    }
    return fallbackArticles;
  }
}

async function fetchArticleById(id: string): Promise<NewsArticle | null> {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.warn("[useNews] Error fetching article (using fallback):", error.message);
      const fallback = fallbackArticles.find((a) => a.id === id);
      return fallback ?? null;
    }

    return dbToNewsArticle(data as DbArticle);
  } catch (error) {
    console.warn("[useNews] Falling back to mock for article:", id);
    const fallback = fallbackArticles.find((a) => a.id === id);
    return fallback ?? null;
  }
}

async function fetchTrending(): Promise<NewsArticle[]> {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("likes", { ascending: false })
      .limit(8);

    if (error) throw error;

    if (!data || data.length === 0) {
      return [...fallbackArticles].sort((a, b) => b.likes - a.likes).slice(0, 8);
    }

    return (data as DbArticle[]).map(dbToNewsArticle);
  } catch (error) {
    console.warn("[useNews] Trending fallback:", error);
    return [...fallbackArticles].sort((a, b) => b.likes - a.likes).slice(0, 8);
  }
}

export function useArticles(category: NewsCategory = "all") {
  return useQuery({
    queryKey: ["articles", category],
    queryFn: () => fetchArticles(category),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ["article", id],
    queryFn: () => fetchArticleById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrendingArticles() {
  return useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrending,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchArticles(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
          .order("published_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        if (!data || data.length === 0) {
          return fallbackArticles.filter(
            (a) =>
              a.title.toLowerCase().includes(query.toLowerCase()) ||
              a.summary.toLowerCase().includes(query.toLowerCase())
          );
        }
        return (data as DbArticle[]).map(dbToNewsArticle);
      } catch {
        return fallbackArticles.filter(
          (a) =>
            a.title.toLowerCase().includes(query.toLowerCase()) ||
            a.summary.toLowerCase().includes(query.toLowerCase())
        );
      }
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

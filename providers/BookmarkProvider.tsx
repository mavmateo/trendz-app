import { useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import { NewsArticle } from "@/types/news";
import { supabase, DbArticle } from "@/lib/supabase";
import { mockArticles } from "@/mocks/news";

const BOOKMARKS_KEY = "trendz_bookmarks";

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
    category: db.category as any,
    source: db.source,
    sourceIcon: db.source_icon,
    author: db.author,
    imageUrl: db.image_url,
    publishedAt,
    readTime: db.read_time,
    tags: db.tags ?? [],
    likes: db.likes,
    comments: db.comments,
    shares: db.shares,
  };
}

export const [BookmarkProvider, useBookmarks] = createContextHook(() => {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<NewsArticle[]>([]);
  const queryClient = useQueryClient();

  const bookmarksQuery = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(BOOKMARKS_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    },
  });

  useEffect(() => {
    if (bookmarksQuery.data) {
      setBookmarkedIds(bookmarksQuery.data);
    }
  }, [bookmarksQuery.data]);

  useEffect(() => {
    if (bookmarkedIds.length === 0) {
      setBookmarkedArticles([]);
      return;
    }

    const fetchBookmarkedArticles = async () => {
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .in("id", bookmarkedIds);

        if (error || !data || data.length === 0) {
          const fallback = mockArticles.filter((a) => bookmarkedIds.includes(a.id));
          setBookmarkedArticles(fallback);
          return;
        }

        setBookmarkedArticles((data as DbArticle[]).map(dbToNewsArticle));
      } catch {
        const fallback = mockArticles.filter((a) => bookmarkedIds.includes(a.id));
        setBookmarkedArticles(fallback);
      }
    };

    fetchBookmarkedArticles();
  }, [bookmarkedIds]);

  const syncMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids));
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const toggleBookmark = useCallback(
    (articleId: string) => {
      const updated = bookmarkedIds.includes(articleId)
        ? bookmarkedIds.filter((id) => id !== articleId)
        : [...bookmarkedIds, articleId];
      setBookmarkedIds(updated);
      syncMutation.mutate(updated);
    },
    [bookmarkedIds, syncMutation]
  );

  const isBookmarked = useCallback(
    (articleId: string) => bookmarkedIds.includes(articleId),
    [bookmarkedIds]
  );

  return {
    bookmarkedIds,
    bookmarkedArticles,
    toggleBookmark,
    isBookmarked,
    isLoading: bookmarksQuery.isLoading,
  };
});

import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";

const LIKES_KEY = "trendz_likes";

interface LikesData {
  [articleId: string]: number;
}

export const [LikesProvider, useLikes] = createContextHook(() => {
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<LikesData>({});
  const queryClient = useQueryClient();

  const likesQuery = useQuery({
    queryKey: ["likes"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(LIKES_KEY);
      if (!stored) return { likedIds: [] as string[], likeCounts: {} as LikesData };
      return JSON.parse(stored) as { likedIds: string[]; likeCounts: LikesData };
    },
  });

  useEffect(() => {
    if (likesQuery.data) {
      setLikedIds(likesQuery.data.likedIds);
      setLikeCounts(likesQuery.data.likeCounts);
    }
  }, [likesQuery.data]);

  const syncMutation = useMutation({
    mutationFn: async (payload: { likedIds: string[]; likeCounts: LikesData }) => {
      await AsyncStorage.setItem(LIKES_KEY, JSON.stringify(payload));
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes"] });
    },
  });

  const toggleLike = useCallback(
    (articleId: string, baseCount: number) => {
      const isCurrentlyLiked = likedIds.includes(articleId);
      const updatedIds = isCurrentlyLiked
        ? likedIds.filter((id) => id !== articleId)
        : [...likedIds, articleId];

      const currentExtra = likeCounts[articleId] ?? 0;
      const updatedCounts = {
        ...likeCounts,
        [articleId]: isCurrentlyLiked ? currentExtra - 1 : currentExtra + 1,
      };

      setLikedIds(updatedIds);
      setLikeCounts(updatedCounts);
      syncMutation.mutate({ likedIds: updatedIds, likeCounts: updatedCounts });
    },
    [likedIds, likeCounts, syncMutation]
  );

  const isLiked = useCallback(
    (articleId: string) => likedIds.includes(articleId),
    [likedIds]
  );

  const getLikeCount = useCallback(
    (articleId: string, baseCount: number) => {
      return baseCount + (likeCounts[articleId] ?? 0);
    },
    [likeCounts]
  );

  return {
    toggleLike,
    isLiked,
    getLikeCount,
  };
});

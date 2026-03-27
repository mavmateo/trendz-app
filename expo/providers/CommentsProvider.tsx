import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";

const COMMENTS_KEY = "trendz_comments";

export interface Comment {
  id: string;
  articleId: string;
  text: string;
  author: string;
  createdAt: string;
}

export const [CommentsProvider, useComments] = createContextHook(() => {
  const [comments, setComments] = useState<Comment[]>([]);
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: ["comments"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(COMMENTS_KEY);
      return stored ? (JSON.parse(stored) as Comment[]) : [];
    },
  });

  useEffect(() => {
    if (commentsQuery.data) {
      setComments(commentsQuery.data);
    }
  }, [commentsQuery.data]);

  const syncMutation = useMutation({
    mutationFn: async (updated: Comment[]) => {
      await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });

  const addComment = useCallback(
    (articleId: string, text: string, author?: string) => {
      const newComment: Comment = {
        id: Date.now().toString(),
        articleId,
        text,
        author: author ?? "You",
        createdAt: new Date().toISOString(),
      };
      const updated = [newComment, ...comments];
      setComments(updated);
      syncMutation.mutate(updated);
      console.log("[Comments] Added comment for article:", articleId);
    },
    [comments, syncMutation]
  );

  const getComments = useCallback(
    (articleId: string) => comments.filter((c) => c.articleId === articleId),
    [comments]
  );

  const getCommentCount = useCallback(
    (articleId: string, baseCount: number) => {
      const localCount = comments.filter((c) => c.articleId === articleId).length;
      return baseCount + localCount;
    },
    [comments]
  );

  return {
    comments,
    addComment,
    getComments,
    getCommentCount,
  };
});

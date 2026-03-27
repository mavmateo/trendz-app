import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, MessageCircle, Share2, Bookmark, Clock, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { NewsArticle } from "@/types/news";
import { useBookmarks } from "@/providers/BookmarkProvider";
import { useLikes } from "@/providers/LikesProvider";
import { useComments } from "@/providers/CommentsProvider";
import { formatNumber } from "@/mocks/news";
import { shareArticle } from "@/lib/share";
import CommentSection from "@/components/CommentSection";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface NewsCardProps {
  article: NewsArticle;
  isActive: boolean;
}

function NewsCard({ article, isActive }: NewsCardProps) {
  const router = useRouter();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const { toggleLike, isLiked, getLikeCount } = useLikes();
  const { getCommentCount } = useComments();
  const bookmarked = isBookmarked(article.id);
  const liked = isLiked(article.id);
  const [commentsVisible, setCommentsVisible] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(bookmarkScale, {
        toValue: 1.4,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(bookmarkScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    toggleBookmark(article.id);
  }, [article.id, toggleBookmark, bookmarkScale]);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.4,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    toggleLike(article.id, article.likes);
  }, [article.id, article.likes, toggleLike, likeScale]);

  const handleOpenComments = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentsVisible(true);
  }, []);

  const handleShare = useCallback(() => {
    shareArticle({
      title: article.title,
      message: `${article.title}\n\n${article.summary}`,
    });
  }, [article.title, article.summary]);

  const handleReadMore = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    router.push(`/article/${article.id}` as any);
  }, [article.id, router, scaleAnim]);

  const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
      politics: "#CE1126",
      entertainment: "#9B59B6",
      sports: "#00A651",
      business: "#D4AF37",
      tech: "#3498DB",
    };
    return map[category] || Colors.dark.accent;
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: article.imageUrl }}
        style={styles.backgroundImage}
        contentFit="cover"
        transition={300}
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)", "rgba(0,0,0,0.95)"]}
        locations={[0, 0.3, 0.65, 1]}
        style={styles.gradient}
      />

      <View style={styles.topBar}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(article.category) }]}>
          <Text style={styles.categoryText}>{article.category.toUpperCase()}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Clock size={12} color="#fff" />
          <Text style={styles.timeText}>{article.publishedAt}</Text>
        </View>
      </View>

      <View style={styles.sideActions}>
        <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
          <TouchableOpacity
            onPress={handleBookmark}
            style={styles.actionButton}
            testID="bookmark-button"
            activeOpacity={0.7}
          >
            <Bookmark
              size={26}
              color={bookmarked ? Colors.dark.accent : "#fff"}
              fill={bookmarked ? Colors.dark.accent : "none"}
            />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <TouchableOpacity
            onPress={handleLike}
            style={styles.actionButton}
            testID="like-button"
            activeOpacity={0.7}
          >
            <Heart
              size={26}
              color={liked ? "#FF4B6E" : "#fff"}
              fill={liked ? "#FF4B6E" : "none"}
            />
            <Text style={styles.actionCount}>
              {formatNumber(getLikeCount(article.id, article.likes))}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={handleOpenComments}
          style={styles.actionButton}
          testID="comment-button"
          activeOpacity={0.7}
        >
          <MessageCircle size={26} color="#fff" />
          <Text style={styles.actionCount}>
            {formatNumber(getCommentCount(article.id, article.comments))}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.actionButton}
          testID="share-button"
          activeOpacity={0.7}
        >
          <Share2 size={26} color="#fff" />
          <Text style={styles.actionCount}>{formatNumber(article.shares)}</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.sourceRow}>
          <Text style={styles.sourceIcon}>{article.sourceIcon}</Text>
          <Text style={styles.sourceName}>{article.source}</Text>
          <View style={styles.dot} />
          <Text style={styles.readTime}>{article.readTime} min read</Text>
        </View>

        <Text style={styles.title} numberOfLines={3}>
          {article.title}
        </Text>

        <Text style={styles.summary} numberOfLines={2}>
          {article.summary}
        </Text>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={handleReadMore}
            style={styles.readMoreButton}
            activeOpacity={0.8}
            testID="read-more-button"
          >
            <Text style={styles.readMoreText}>Read Full Story</Text>
            <ChevronRight size={18} color={Colors.dark.background} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.tagsRow}>
          {article.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag.replace(/\s/g, "")}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <CommentSection
        articleId={article.id}
        baseCommentCount={article.comments}
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
      />
    </View>
  );
}

export default React.memo(NewsCard);

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: Colors.dark.background,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: "absolute" as const,
    top: Platform.OS === "web" ? 20 : 60,
    left: 16,
    right: 16,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
  },
  timeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500" as const,
  },
  sideActions: {
    position: "absolute" as const,
    right: 12,
    bottom: 220,
    alignItems: "center" as const,
    gap: 20,
  },
  actionButton: {
    alignItems: "center" as const,
    gap: 4,
  },
  actionCount: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  content: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 60,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "web" ? 40 : 100,
  },
  sourceRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 10,
    gap: 6,
  },
  sourceIcon: {
    fontSize: 16,
  },
  sourceName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  readTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800" as const,
    lineHeight: 30,
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  summary: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  readMoreButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    alignSelf: "flex-start" as const,
    gap: 4,
    marginBottom: 12,
  },
  readMoreText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  tagsRow: {
    flexDirection: "row" as const,
    gap: 8,
    flexWrap: "wrap" as const,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500" as const,
  },
});

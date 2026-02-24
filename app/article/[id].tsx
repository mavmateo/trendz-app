import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ArrowLeft, Bookmark, Share2, Clock, User, Heart, MessageCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useArticle } from "@/hooks/useNews";
import { formatNumber } from "@/mocks/news";
import { useBookmarks } from "@/providers/BookmarkProvider";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEADER_HEIGHT = 360;

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const scrollY = useRef(new Animated.Value(0)).current;

  const { data: article, isLoading } = useArticle(id ?? "");

  const bookmarked = article ? isBookmarked(article.id) : false;

  const handleBookmark = useCallback(() => {
    if (!article) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleBookmark(article.id);
  }, [article, toggleBookmark]);

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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Article not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const paragraphs = article.body.split("\n\n");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top,
            opacity: headerOpacity,
          },
        ]}
      >
        <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
          {article.title}
        </Text>
      </Animated.View>

      <View style={[styles.topActions, { top: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.actionCircle}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topActionsRight}>
          <TouchableOpacity
            onPress={handleBookmark}
            style={styles.actionCircle}
            activeOpacity={0.7}
          >
            <Bookmark
              size={20}
              color={bookmarked ? Colors.dark.accent : "#fff"}
              fill={bookmarked ? Colors.dark.accent : "none"}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCircle} activeOpacity={0.7}>
            <Share2 size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={["transparent", "rgba(10,10,15,0.6)", Colors.dark.background]}
            locations={[0.3, 0.7, 1]}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(article.category) }]}>
              <Text style={styles.categoryText}>{article.category.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.articleBody}>
          <Text style={styles.articleTitle}>{article.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.authorRow}>
              <View style={styles.authorAvatar}>
                <User size={14} color={Colors.dark.textMuted} />
              </View>
              <Text style={styles.authorName}>{article.author}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.timeRow}>
              <Clock size={13} color={Colors.dark.textMuted} />
              <Text style={styles.timeText}>{article.readTime} min read</Text>
            </View>
          </View>

          <View style={styles.sourceBar}>
            <Text style={styles.sourceIcon}>{article.sourceIcon}</Text>
            <Text style={styles.sourceName}>{article.source}</Text>
            <Text style={styles.publishedAt}>· {article.publishedAt}</Text>
          </View>

          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Heart size={16} color={Colors.dark.accent} />
              <Text style={styles.statText}>{formatNumber(article.likes)}</Text>
            </View>
            <View style={styles.statItem}>
              <MessageCircle size={16} color={Colors.dark.textMuted} />
              <Text style={styles.statText}>{formatNumber(article.comments)}</Text>
            </View>
            <View style={styles.statItem}>
              <Share2 size={16} color={Colors.dark.textMuted} />
              <Text style={styles.statText}>{formatNumber(article.shares)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.summary}>{article.summary}</Text>

          {paragraphs.map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}

          <View style={styles.tagsSection}>
            <Text style={styles.tagsLabel}>Related Topics</Text>
            <View style={styles.tagsRow}>
              {article.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag.replace(/\s/g, "")}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 60 + insets.bottom }} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centered: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  errorText: {
    color: Colors.dark.textMuted,
    fontSize: 16,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    color: Colors.dark.background,
    fontWeight: "700" as const,
  },
  stickyHeader: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.background,
    zIndex: 20,
    paddingHorizontal: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  stickyHeaderTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },
  topActions: {
    position: "absolute" as const,
    left: 16,
    right: 16,
    zIndex: 30,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  topActionsRight: {
    flexDirection: "row" as const,
    gap: 10,
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  heroContainer: {
    height: HEADER_HEIGHT,
    width: SCREEN_WIDTH,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: "absolute" as const,
    bottom: 20,
    left: 20,
  },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
  },
  articleBody: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  articleTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 12,
    gap: 12,
  },
  authorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  authorName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.dark.border,
  },
  timeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  timeText: {
    color: Colors.dark.textMuted,
    fontSize: 13,
  },
  sourceBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 16,
  },
  sourceIcon: {
    fontSize: 16,
  },
  sourceName: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  publishedAt: {
    color: Colors.dark.textMuted,
    fontSize: 13,
  },
  statsBar: {
    flexDirection: "row" as const,
    gap: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  statText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginBottom: 20,
  },
  summary: {
    color: Colors.dark.accent,
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 24,
    marginBottom: 20,
    fontStyle: "italic" as const,
  },
  paragraph: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
  },
  tagsSection: {
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  tagsLabel: {
    color: Colors.dark.textMuted,
    fontSize: 13,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.dark.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tagText: {
    color: Colors.dark.accent,
    fontSize: 13,
    fontWeight: "500" as const,
  },
});

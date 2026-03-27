import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useBookmarks } from "@/providers/BookmarkProvider";
import { formatNumber } from "@/mocks/news";
import { NewsArticle } from "@/types/news";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bookmarkedArticles, toggleBookmark } = useBookmarks();

  const handleArticlePress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/article/${id}` as any);
    },
    [router]
  );

  const handleRemoveBookmark = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      toggleBookmark(id);
    },
    [toggleBookmark]
  );

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

  const renderItem = useCallback(
    ({ item }: { item: NewsArticle }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleArticlePress(item.id)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.cardContent}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardSummary} numberOfLines={2}>
            {item.summary}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardSource}>
              {item.sourceIcon} {item.source} · {item.publishedAt}
            </Text>
            <TouchableOpacity
              onPress={() => handleRemoveBookmark(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={16} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleArticlePress, handleRemoveBookmark]
  );

  const keyExtractor = useCallback((item: NewsArticle) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        <Text style={styles.headerSubtitle}>
          {bookmarkedArticles.length} article{bookmarkedArticles.length !== 1 ? "s" : ""} saved
        </Text>
      </View>

      {bookmarkedArticles.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Bookmark size={48} color={Colors.dark.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No saved articles yet</Text>
          <Text style={styles.emptyDescription}>
            Tap the bookmark icon on any article to save it for later reading
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarkedArticles}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          testID="bookmarks-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    overflow: "hidden" as const,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  cardContent: {
    padding: 14,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start" as const,
    marginBottom: 8,
  },
  categoryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "700" as const,
    lineHeight: 22,
    marginBottom: 6,
  },
  cardSummary: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  cardSource: {
    color: Colors.dark.textMuted,
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
    lineHeight: 20,
  },
});

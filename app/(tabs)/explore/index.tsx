import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Search, TrendingUp } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTrendingArticles, useArticles, useSearchArticles } from "@/hooks/useNews";
import { categories, formatNumber } from "@/mocks/news";
import { NewsArticle, NewsCategory } from "@/types/news";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: trending = [], isLoading: trendingLoading } = useTrendingArticles();
  const { data: allArticles = [] } = useArticles("all");
  const { data: searchResults = [], isLoading: searchLoading } = useSearchArticles(searchQuery);

  const handleArticlePress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/article/${id}` as any);
    },
    [router]
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

  const renderTrendingCard = (article: NewsArticle, index: number) => (
    <TouchableOpacity
      key={article.id}
      style={styles.trendingCard}
      onPress={() => handleArticlePress(article.id)}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: article.imageUrl }}
        style={styles.trendingImage}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.trendingGradient}
      />
      <View style={styles.trendingRank}>
        <Text style={styles.trendingRankText}>{index + 1}</Text>
      </View>
      <View style={styles.trendingContent}>
        <View style={[styles.miniCategoryBadge, { backgroundColor: getCategoryColor(article.category) }]}>
          <Text style={styles.miniCategoryText}>{article.category}</Text>
        </View>
        <Text style={styles.trendingTitle} numberOfLines={2}>
          {article.title}
        </Text>
        <View style={styles.trendingMeta}>
          <Text style={styles.trendingSource}>{article.source}</Text>
          <Text style={styles.trendingLikes}>{formatNumber(article.likes)} likes</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = (catKey: NewsCategory, catLabel: string) => {
    if (catKey === "all") return null;
    const catArticles = allArticles.filter((a) => a.category === catKey).slice(0, 4);
    if (catArticles.length === 0) return null;

    return (
      <View key={catKey} style={styles.categorySection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionDot, { backgroundColor: getCategoryColor(catKey) }]} />
            <Text style={styles.sectionTitle}>{catLabel}</Text>
          </View>
          <Text style={styles.sectionCount}>{catArticles.length} stories</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {catArticles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.compactCard}
              onPress={() => handleArticlePress(article.id)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: article.imageUrl }}
                style={styles.compactImage}
                contentFit="cover"
                transition={200}
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={styles.compactGradient}
              />
              <View style={styles.compactContent}>
                <Text style={styles.compactTitle} numberOfLines={2}>
                  {article.title}
                </Text>
                <Text style={styles.compactMeta}>{article.source} · {article.publishedAt}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Discover what's happening in Ghana</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={Colors.dark.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search news, topics..."
          placeholderTextColor={Colors.dark.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="search-input"
        />
        {searchLoading && <ActivityIndicator size="small" color={Colors.dark.accent} />}
      </View>

      {searchQuery.length >= 2 ? (
        <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
          {searchResults.length === 0 && !searchLoading ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>No results found for "{searchQuery}"</Text>
            </View>
          ) : (
            searchResults.map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.searchResultItem}
                onPress={() => handleArticlePress(article.id)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: article.imageUrl }}
                  style={styles.searchResultImage}
                  contentFit="cover"
                />
                <View style={styles.searchResultContent}>
                  <View style={[styles.miniCategoryBadge, { backgroundColor: getCategoryColor(article.category) }]}>
                    <Text style={styles.miniCategoryText}>{article.category}</Text>
                  </View>
                  <Text style={styles.searchResultTitle} numberOfLines={2}>
                    {article.title}
                  </Text>
                  <Text style={styles.searchResultMeta}>{article.source} · {article.publishedAt}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.trendingSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <TrendingUp size={18} color={Colors.dark.accent} />
                <Text style={styles.sectionTitle}>Trending Now</Text>
              </View>
            </View>
            {trendingLoading ? (
              <ActivityIndicator size="small" color={Colors.dark.accent} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.trendingGrid}>
                {trending.slice(0, 4).map((article, index) => renderTrendingCard(article, index))}
              </View>
            )}
          </View>

          {categories.map((cat) => renderCategorySection(cat.key, cat.label))}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    paddingBottom: 4,
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
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.dark.surfaceElevated,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  trendingSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  sectionCount: {
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  trendingGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 16,
    gap: 12,
  },
  trendingCard: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: 16,
    overflow: "hidden" as const,
    backgroundColor: Colors.dark.surface,
  },
  trendingImage: {
    width: "100%",
    height: "100%",
  },
  trendingGradient: {
    ...StyleSheet.absoluteFillObject,
    top: "40%",
  },
  trendingRank: {
    position: "absolute" as const,
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  trendingRankText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: "800" as const,
  },
  trendingContent: {
    position: "absolute" as const,
    bottom: 10,
    left: 10,
    right: 10,
  },
  miniCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start" as const,
    marginBottom: 4,
  },
  miniCategoryText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  trendingTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700" as const,
    lineHeight: 17,
  },
  trendingMeta: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 4,
  },
  trendingSource: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
  },
  trendingLikes: {
    color: Colors.dark.accent,
    fontSize: 10,
    fontWeight: "600" as const,
  },
  categorySection: {
    marginTop: 28,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  compactCard: {
    width: 240,
    height: 150,
    borderRadius: 14,
    overflow: "hidden" as const,
    backgroundColor: Colors.dark.surface,
  },
  compactImage: {
    width: "100%",
    height: "100%",
  },
  compactGradient: {
    ...StyleSheet.absoluteFillObject,
    top: "30%",
  },
  compactContent: {
    position: "absolute" as const,
    bottom: 10,
    left: 10,
    right: 10,
  },
  compactTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700" as const,
    lineHeight: 17,
  },
  compactMeta: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    marginTop: 4,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchResultItem: {
    flexDirection: "row" as const,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    overflow: "hidden" as const,
    marginBottom: 12,
  },
  searchResultImage: {
    width: 100,
    height: 100,
  },
  searchResultContent: {
    flex: 1,
    padding: 12,
    justifyContent: "center" as const,
  },
  searchResultTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  searchResultMeta: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  emptySearch: {
    paddingTop: 60,
    alignItems: "center" as const,
  },
  emptySearchText: {
    color: Colors.dark.textMuted,
    fontSize: 15,
  },
});

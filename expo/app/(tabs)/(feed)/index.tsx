import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
  StatusBar,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NewsCard from "@/components/NewsCard";
import { categories } from "@/mocks/news";
import { useArticles } from "@/hooks/useNews";
import { NewsCategory } from "@/types/news";
import Colors from "@/constants/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function FeedScreen() {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { data: articles = [], isLoading, refetch, isRefetching } = useArticles(activeCategory);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const handleCategoryChange = useCallback((category: NewsCategory) => {
    setActiveCategory(category);
    setActiveIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof articles)[0]; index: number }) => (
      <NewsCard article={item} isActive={index === activeIndex} />
    ),
    [activeIndex]
  );

  const keyExtractor = useCallback((item: (typeof articles)[0]) => item.id, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    []
  );

  if (isLoading && articles.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
        <Text style={styles.loadingText}>Loading news...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS !== "web"}
        maxToRenderPerBatch={3}
        windowSize={3}
        testID="feed-list"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.dark.accent}
          />
        }
      />

      <View style={[styles.categoryBar, { top: insets.top + 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => handleCategoryChange(cat.key)}
              style={[
                styles.categoryChip,
                activeCategory === cat.key && styles.categoryChipActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  activeCategory === cat.key && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
  loadingText: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  categoryBar: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  categoryScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  categoryChipActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  categoryChipText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  categoryChipTextActive: {
    color: Colors.dark.background,
  },
});

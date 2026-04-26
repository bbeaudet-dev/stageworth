import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";

import { ShowRowAccordion, type RankedShow } from "@/components/show-row-accordion";
import { SHOW_TYPE_COLORS } from "@/constants/showTypeColors";
import type { Id } from "@/convex/_generated/dataModel";
import { CategoryNavBar } from "@/features/my-shows/components/CategoryNavBar";
import type { GenreListItem } from "@/features/my-shows/types";
import { useColorScheme } from "@/hooks/use-color-scheme";

const NOOP = () => {};
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 10 } as const;

export function MyShowsGenreView({
  items,
  pendingRemoveIds,
  onRemoveShow,
  onOpenShowDetails,
  tabBarHeight,
  showCategoryNav = false,
}: {
  items: GenreListItem[];
  pendingRemoveIds: Set<Id<"shows">>;
  onRemoveShow: (showId: Id<"shows">) => void;
  onOpenShowDetails: (show: RankedShow) => void;
  tabBarHeight: number;
  showCategoryNav?: boolean;
}) {
  const flatListRef = useRef<FlatList<GenreListItem> | null>(null);

  const genreIndices = useMemo(() => {
    const indices: { listIndex: number; label: string }[] = [];
    items.forEach((item, idx) => {
      if (item.kind === "genre") indices.push({ listIndex: idx, label: item.label });
    });
    return indices;
  }, [items]);

  const genreIndicesRef = useRef(genreIndices);
  genreIndicesRef.current = genreIndices;

  const [activeCategory, setActiveCategory] = useState(0);

  const scrollLockUntilRef = useRef(0);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (Date.now() < scrollLockUntilRef.current) return;
      const idx = genreIndicesRef.current;
      if (idx.length === 0 || viewableItems.length === 0) return;
      let topmostIndex: number | null = null;
      for (const v of viewableItems) {
        if (v.index == null) continue;
        if (topmostIndex == null || v.index < topmostIndex) topmostIndex = v.index;
      }
      if (topmostIndex == null) return;
      let nextActive = 0;
      for (let i = 0; i < idx.length; i += 1) {
        if (idx[i].listIndex <= topmostIndex) nextActive = i;
        else break;
      }
      setActiveCategory((prev) => (prev === nextActive ? prev : nextActive));
    }
  ).current;

  const scrollToCategory = useCallback((newIndex: number) => {
    const target = genreIndicesRef.current[newIndex];
    if (!target) return;
    scrollLockUntilRef.current = Date.now() + 1200;
    setActiveCategory(newIndex);
    flatListRef.current?.scrollToIndex({
      index: target.listIndex,
      animated: true,
      viewPosition: 0,
    });
  }, []);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const emptyTextColor = theme === "dark" ? "#A0A4AA" : "#999";

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GenreListItem>) => {
      if (item.kind === "genre") {
        const palette = SHOW_TYPE_COLORS[item.type];
        const chipBg = palette.chipBg[theme];
        const chipText = palette.accent[theme];
        return (
          <View style={styles.genreHeaderRow}>
            <View style={[styles.genreHeaderBadge, { backgroundColor: chipBg }]}>
              <Text style={[styles.genreHeaderText, { color: chipText }]}>{item.label}</Text>
            </View>
          </View>
        );
      }

      return (
        <ShowRowAccordion
          item={item.show}
          index={0}
          rankLabel={item.rankLabel}
          tierHeader={null}
          isRemoving={pendingRemoveIds.has(item.show._id)}
          onViewShowDetails={() => onOpenShowDetails(item.show)}
          onRemove={() => onRemoveShow(item.show._id)}
          drag={NOOP}
          isActive={false}
          hideDragHandle
          disableRemoveActions
        />
      );
    },
    [
      onOpenShowDetails,
      onRemoveShow,
      pendingRemoveIds,
      theme,
    ]
  );

  return (
    <View style={styles.listWrapper}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: emptyTextColor }]}>No shows ranked yet.</Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              tabBarHeight + (showCategoryNav ? 56 : 0) + 24,
          },
        ]}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
      />
      {showCategoryNav && genreIndices.length > 1 ? (
        <CategoryNavBar
          canPrev={activeCategory > 0}
          canNext={activeCategory < genreIndices.length - 1}
          onPrev={() => scrollToCategory(activeCategory - 1)}
          onNext={() => scrollToCategory(activeCategory + 1)}
          currentLabel={genreIndices[activeCategory]?.label ?? null}
          bottomInset={tabBarHeight}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  empty: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  genreHeaderRow: {
    paddingTop: 10,
    paddingBottom: 2,
    alignItems: "flex-start",
  },
  genreHeaderBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 2,
  },
  genreHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
});

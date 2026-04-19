import { useCallback, useMemo, useRef, useState } from "react";

import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ShowRowAccordion, type RankedShow } from "@/components/show-row-accordion";
import type { Id } from "@/convex/_generated/dataModel";
import { CategoryNavBar } from "@/features/my-shows/components/CategoryNavBar";
import type { LineMeta, ListItem, RankingTier, TierHeaderMeta } from "@/features/my-shows/types";

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 10 } as const;

export function MyShowsListView({
  listItems,
  expandedShowId,
  setExpandedShowId,
  pendingRemoveIds,
  onRemoveShow,
  getShowTier,
  onDragEnd,
  onOpenShowDetails,
  tabBarHeight,
  tierHeaders,
  lineMeta,
  listHeaderComponent,
  onScroll,
  showCategoryNav = false,
}: {
  listItems: ListItem[];
  expandedShowId: Id<"shows"> | null;
  setExpandedShowId: (id: Id<"shows"> | null) => void;
  pendingRemoveIds: Set<Id<"shows">>;
  onRemoveShow: (showId: Id<"shows">) => void;
  getShowTier: (show: RankedShow) => RankingTier;
  onDragEnd: (params: { data: ListItem[]; from: number; to: number }) => Promise<void>;
  onOpenShowDetails: (show: RankedShow) => void;
  tabBarHeight: number;
  tierHeaders: Record<RankingTier, TierHeaderMeta>;
  lineMeta: Record<"wouldSeeAgain" | "stayedHome", LineMeta>;
  listHeaderComponent?: React.ReactNode;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showCategoryNav?: boolean;
}) {
  const flatListRef = useRef<FlatList<ListItem> | null>(null);

  const tierIndices = useMemo(() => {
    const indices: { listIndex: number; tier: RankingTier }[] = [];
    listItems.forEach((item, idx) => {
      if (item.kind === "tier") indices.push({ listIndex: idx, tier: item.tier });
    });
    return indices;
  }, [listItems]);

  const tierIndicesRef = useRef(tierIndices);
  tierIndicesRef.current = tierIndices;

  const [activeCategory, setActiveCategory] = useState(0);

  const scrollLockUntilRef = useRef(0);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (Date.now() < scrollLockUntilRef.current) return;
      const idx = tierIndicesRef.current;
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

  const scrollToCategory = useCallback(
    (newIndex: number) => {
      const target = tierIndicesRef.current[newIndex];
      if (!target) return;
      scrollLockUntilRef.current = Date.now() + 1200;
      setActiveCategory(newIndex);
      flatListRef.current?.scrollToIndex({
        index: target.listIndex,
        animated: true,
        viewPosition: 0,
      });
    },
    []
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ListItem>) => {
      const listIndex = getIndex() ?? 0;

      if (item.kind === "line") {
        const meta = lineMeta[item.line];
        return (
          <ScaleDecorator>
            <Pressable
              onLongPress={drag}
              delayLongPress={120}
              style={[styles.specialLineRow, isActive && styles.specialLineRowActive]}
            >
              <Text style={[styles.specialLineArrow, { color: meta.color }]}>{meta.arrow}</Text>
              <View style={[styles.specialLineTrack, { borderTopColor: meta.color }]} />
              <Text style={[styles.specialLineLabel, { color: meta.color }]}>{meta.label}</Text>
            </Pressable>
          </ScaleDecorator>
        );
      }

      if (item.kind === "tier") {
        const tier = tierHeaders[item.tier];
        return (
          <View style={styles.tierHeaderRow}>
            <View style={[styles.tierHeaderBadge, { backgroundColor: tier.color }]}>
              <Text style={[styles.tierHeaderBadgeText, { color: tier.textColor }]}>
                {tier.label}
              </Text>
            </View>
          </View>
        );
      }

      const showIndex = listItems
        .slice(0, listIndex + 1)
        .filter((listItem) => listItem.kind === "show").length;
      const tier = getShowTier(item.show);
      const rankLabel = tier === "unranked" ? "—" : undefined;

      return (
        <ScaleDecorator>
          <ShowRowAccordion
            item={item.show}
            index={showIndex - 1}
            rankLabel={rankLabel}
            tierHeader={null}
            isExpanded={expandedShowId === item.show._id}
            isRemoving={pendingRemoveIds.has(item.show._id)}
            onToggle={() => setExpandedShowId(expandedShowId === item.show._id ? null : item.show._id)}
            onViewShowDetails={() => onOpenShowDetails(item.show)}
            onRemove={() => onRemoveShow(item.show._id)}
            drag={drag}
            isActive={isActive}
          />
        </ScaleDecorator>
      );
    },
    [
      expandedShowId,
      getShowTier,
      lineMeta,
      listItems,
      onOpenShowDetails,
      onRemoveShow,
      pendingRemoveIds,
      setExpandedShowId,
      tierHeaders,
    ]
  );

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const emptyTextColor = theme === "dark" ? "#A0A4AA" : "#999";

  return (
    <View style={styles.listWrapper}>
      <DraggableFlatList
        ref={flatListRef as unknown as React.RefObject<any>}
        data={listItems}
        onDragEnd={(payload) => onDragEnd(payload)}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeaderComponent ? () => <>{listHeaderComponent}</> : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: emptyTextColor }]}>No shows ranked yet.</Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (showCategoryNav ? 0 : tabBarHeight) + 24 },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
      />
      {showCategoryNav && tierIndices.length > 1 ? (
        <CategoryNavBar
          canPrev={activeCategory > 0}
          canNext={activeCategory < tierIndices.length - 1}
          onPrev={() => scrollToCategory(activeCategory - 1)}
          onNext={() => scrollToCategory(activeCategory + 1)}
          currentLabel={tierHeaders[tierIndices[activeCategory]?.tier]?.label ?? null}
          bottomInset={tabBarHeight}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  tierHeaderRow: {
    paddingTop: 2,
    paddingBottom: 2,
    alignItems: "flex-end",
  },
  tierHeaderBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 2,
  },
  tierHeaderBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  specialLineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
    marginTop: 0,
    marginBottom: 0,
    minHeight: 14,
  },
  specialLineRowActive: {
    opacity: 0.72,
  },
  specialLineLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginLeft: 6,
  },
  specialLineTrack: {
    flex: 1,
    borderTopWidth: 2,
    marginTop: 0,
  },
  specialLineArrow: {
    fontSize: 11,
    fontWeight: "800",
    marginRight: 6,
  },
});

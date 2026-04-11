import { Image } from "expo-image";
import { Pressable, Text, TextInput, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ShowPlaceholder } from "@/components/ShowPlaceholder";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { playbillMatBackground } from "@/features/browse/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TYPE_LABELS } from "@/features/add-visit/hooks/useAddVisitData";
import { styles } from "@/features/add-visit/styles";
import type { ShowType, UserShowStatus } from "@/features/add-visit/types";

type SearchShow = {
  _id: Id<"shows">;
  name: string;
  type: ShowType;
  images?: string[];
};

export function ShowPickerSection({
  hasSelectedShow,
  showNameForHeader,
  selectedShowArt,
  clearSelection,
  query,
  setQuery,
  searchResults,
  hasExactMatch,
  exactMatches,
  allShowsLoaded,
  selectCustomShow,
  selectExistingShow,
  userShowStatusById,
  visitedShowIds,
}: {
  hasSelectedShow: boolean;
  showNameForHeader: string;
  /** Resolved show image URL (if any) + type for placeholder; omit imageUrl for custom shows. */
  selectedShowArt: { imageUrl: string | null; type?: ShowType } | null;
  clearSelection: () => void;
  query: string;
  setQuery: (value: string) => void;
  searchResults: SearchShow[];
  hasExactMatch: boolean;
  exactMatches: SearchShow[];
  allShowsLoaded: boolean;
  selectCustomShow: () => void;
  selectExistingShow: (showId: Id<"shows">) => void;
  userShowStatusById: Map<Id<"shows">, UserShowStatus>;
  visitedShowIds: Set<Id<"shows">>;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const mat = playbillMatBackground(theme);
  return (
    <View style={styles.section}>
      {hasSelectedShow ? (
        <View style={[styles.selectedShowCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.selectedShowRow}>
            <View style={[styles.selectedShowThumbWrap, { backgroundColor: mat }]}>
              {selectedShowArt?.imageUrl ? (
                <Image
                  source={{ uri: selectedShowArt.imageUrl }}
                  style={styles.selectedShowThumbImage}
                  contentFit="contain"
                />
              ) : (
                <ShowPlaceholder
                  name={showNameForHeader}
                  type={selectedShowArt?.type ?? "other"}
                  style={{
                    width: 54,
                    height: 81,
                    aspectRatio: undefined,
                    paddingHorizontal: 4,
                    gap: 2,
                  }}
                />
              )}
            </View>
            <View style={styles.selectedShowTextCol}>
              <Text style={[styles.selectedShowName, { color: c.text }]} numberOfLines={3}>
                {showNameForHeader}
              </Text>
              <Pressable onPress={clearSelection} hitSlop={8}>
                <Text style={[styles.changeShowText, { color: c.accent }]}>Change</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a show"
            placeholderTextColor={c.mutedText}
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            onSubmitEditing={() => {
              if (!query.trim()) return;
              const top = searchResults[0];
              if (top) selectExistingShow(top._id);
            }}
          />
          {allShowsLoaded && (
            <View style={[styles.resultsCard, { borderColor: c.border }]}>
              {!hasExactMatch && query.trim().length > 0 && (
                <Pressable style={[styles.customShowRow, { backgroundColor: c.surface }]} onPress={selectCustomShow}>
                  <Text style={[styles.customShowText, { color: c.accent }]}>Add {query.trim()} as custom show</Text>
                </Pressable>
              )}
              {searchResults.length === 0 && query.trim().length > 0 && hasExactMatch && (
                <View style={styles.noResultsRow}>
                  <Text style={[styles.noResultsText, { color: c.mutedText }]}>No matching shows</Text>
                </View>
              )}
              {searchResults.map((show) => {
                const status = userShowStatusById.get(show._id);
                const hasSeen = visitedShowIds.has(show._id) || status !== undefined;
                const isExact = query.trim().length > 0 && exactMatches.length === 1 && searchResults[0]?._id === show._id && exactMatches[0]?._id === show._id;
                const posterUrl = show.images?.[0] ?? null;
                return (
                  <Pressable
                    key={show._id}
                    style={[
                      styles.resultRow,
                      { borderTopColor: c.border },
                      isExact ? { backgroundColor: theme === "dark" ? "#1a2e1a" : "#e2f3e6" } : { backgroundColor: c.surfaceElevated },
                    ]}
                    onPress={() => selectExistingShow(show._id)}
                  >
                    {/* Poster thumbnail */}
                    <View style={[styles.resultPoster, { backgroundColor: c.surface }]}>
                      {posterUrl ? (
                        <Image source={{ uri: posterUrl }} style={styles.resultPosterImg} contentFit="contain" />
                      ) : (
                        <View style={styles.resultPosterFallback}>
                          <Text style={[styles.resultPosterFallbackText, { color: c.mutedText }]} numberOfLines={3}>
                            {show.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Name — flex:1 so it truncates before pushing meta off-screen */}
                    <Text style={[styles.resultName, { color: c.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {show.name}
                    </Text>

                    {/* Right-aligned meta: type label then eye icon */}
                    <View style={styles.resultMeta}>
                      <Text style={[styles.resultType, { color: c.mutedText }]}>{TYPE_LABELS[show.type]}</Text>
                      {hasSeen ? (
                        <View style={[styles.statusBadge, styles.statusBadgeSeen]}>
                          <IconSymbol name="eye.fill" size={12} color="#0284c7" />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

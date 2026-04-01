import { Pressable, Text, TextInput, View } from "react-native";

import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TYPE_LABELS } from "@/features/add-visit/hooks/useAddVisitData";
import { styles } from "@/features/add-visit/styles";
import type { ShowType, UserShowStatus } from "@/features/add-visit/types";

type SearchShow = {
  _id: Id<"shows">;
  name: string;
  type: ShowType;
};

export function ShowPickerSection({
  hasSelectedShow,
  showNameForHeader,
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
  return (
    <View style={styles.section}>
      {hasSelectedShow ? (
        <View style={[styles.selectedShowCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.selectedShowName, { color: c.text }]}>{showNameForHeader}</Text>
          <Pressable onPress={clearSelection}>
            <Text style={[styles.changeShowText, { color: c.accent }]}>Change</Text>
          </Pressable>
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
                    <Text style={[styles.resultName, { color: c.text }]}>{show.name}</Text>
                    <View style={styles.resultMeta}>
                      {hasSeen ? (
                        <View style={[styles.statusBadge, styles.statusBadgeSeen]}>
                          <Text style={[styles.statusBadgeText, styles.statusBadgeIcon]}>👁</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.resultType, { color: c.mutedText }]}>{TYPE_LABELS[show.type]}</Text>
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

import { Pressable, Text, TextInput, View } from "react-native";

import type { Id } from "@/convex/_generated/dataModel";
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
  return (
    <View style={styles.section}>
      {hasSelectedShow ? (
        <View style={styles.selectedShowCard}>
          <Text style={styles.selectedShowName}>{showNameForHeader}</Text>
          <Pressable onPress={clearSelection}>
            <Text style={styles.changeShowText}>Change</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a show"
            style={styles.input}
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
            <View style={styles.resultsCard}>
              {!hasExactMatch && (
                <Pressable style={styles.customShowRow} onPress={selectCustomShow}>
                  <Text style={styles.customShowText}>Add {query.trim()} as custom show</Text>
                </Pressable>
              )}
              {searchResults.length === 0 && query.trim().length > 0 && hasExactMatch && (
                <View style={styles.noResultsRow}>
                  <Text style={styles.noResultsText}>No matching shows</Text>
                </View>
              )}
              {query.trim().length === 0 && (
                <View style={styles.suggestionHeaderRow}>
                  <Text style={styles.suggestionHeaderText}>Suggestions</Text>
                </View>
              )}
              {searchResults.map((show) => {
                const status = userShowStatusById.get(show._id);
                const hasSeen = visitedShowIds.has(show._id) || status !== undefined;
                return (
                  <Pressable
                    key={show._id}
                    style={[
                      styles.resultRow,
                      query.trim().length > 0 &&
                        exactMatches.length === 1 &&
                        searchResults[0]?._id === show._id &&
                        exactMatches[0]?._id === show._id
                        ? styles.resultRowExactMatch
                        : null,
                    ]}
                    onPress={() => selectExistingShow(show._id)}
                  >
                    <Text style={styles.resultName}>{show.name}</Text>
                    <View style={styles.resultMeta}>
                      {hasSeen ? (
                        <View style={[styles.statusBadge, styles.statusBadgeSeen]}>
                          <Text style={[styles.statusBadgeText, styles.statusBadgeIcon]}>👁</Text>
                        </View>
                      ) : null}
                      <Text style={styles.resultType}>{TYPE_LABELS[show.type]}</Text>
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

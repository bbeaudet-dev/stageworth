import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CatalogFeedbackLink } from "@/components/CatalogFeedbackLink";
import { EmptyState } from "@/components/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { SearchShowCard } from "@/features/search-browse/components/SearchShowCard";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { chunkRows } from "@/utils/arrays";
import { getInitials } from "@/utils/user";

const GRID_GAP = 8;
const GRID_COLUMNS = 4;

function formatDistrict(district: string): string {
  const map: Record<string, string> = {
    broadway: "Broadway",
    off_broadway: "Off-Broadway",
    off_off_broadway: "Off-Off-Broadway",
    west_end: "West End",
    touring: "Touring",
    regional: "Regional",
    other: "Other",
  };
  return map[district] ?? district;
}

interface SearchResultsListProps {
  showResults: { _id: string; name: string; images?: string[] }[] | undefined;
  userResults: { _id: string; username: string; name?: string | null; avatarUrl?: string | null }[] | undefined;
  venueResults: { _id: string; name: string; city?: string | null; state?: string | null; district?: string | null }[] | undefined;
  trimmed: string;
  noResults: boolean;
  showLimit: number;
  peopleLimit: number;
  venueLimit: number;
  onLoadMoreShows: () => void;
  onLoadMorePeople: () => void;
  onLoadMoreVenues: () => void;
  cardWidth: number;
  getListStatus: (showId: string) => "want_to_see" | "look_into" | "not_interested" | "uncategorized" | "none" | undefined;
  onNavigateToShow: (showId: string, showName?: string) => void;
  onOpenListSheet: (showId: Id<"shows">, showName: string) => void;
}

export function SearchResultsList({
  showResults,
  userResults,
  venueResults,
  trimmed,
  noResults,
  showLimit,
  peopleLimit,
  venueLimit,
  onLoadMoreShows,
  onLoadMorePeople,
  onLoadMoreVenues,
  cardWidth,
  getListStatus,
  onNavigateToShow,
  onOpenListSheet,
}: SearchResultsListProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const surface = Colors[theme].surfaceElevated;
  const border = Colors[theme].border;
  const text = Colors[theme].text;
  const muted = Colors[theme].mutedText;
  const accent = Colors[theme].accent;
  const posterBg = theme === "dark" ? "#27272f" : "#efefef";

  const hasShowResults = showResults && showResults.length > 0;
  const hasUserResults = userResults && userResults.length > 0;
  const hasVenueResults = venueResults && venueResults.length > 0;

  return (
    <>
      {hasShowResults && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>Shows</Text>
          <View style={styles.grid}>
            {chunkRows(showResults.slice(0, showLimit), GRID_COLUMNS).map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((show) => (
                  <SearchShowCard
                    key={show._id}
                    show={show}
                    cardWidth={cardWidth}
                    surfaceColor={surface}
                    posterBg={posterBg}
                    mutedColor={muted}
                    listStatus={getListStatus(show._id)}
                    onPress={() => onNavigateToShow(show._id, show.name)}
                    onListIconPress={() => onOpenListSheet(show._id as Id<"shows">, show.name)}
                  />
                ))}
              </View>
            ))}
          </View>
          {showResults.length > showLimit && (
            <Pressable style={[styles.loadMoreBtn, { borderColor: border }]} onPress={onLoadMoreShows}>
              <Text style={[styles.loadMoreText, { color: accent }]}>Load more shows</Text>
            </Pressable>
          )}
        </View>
      )}

      {hasUserResults && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>People</Text>
          {userResults.slice(0, peopleLimit).map((user) => (
            <Pressable
              key={user._id}
              style={[styles.userRow, { backgroundColor: surface, borderColor: border }]}
              onPress={() => router.push({ pathname: "/user/[username]", params: { username: user.username } })}
            >
              <View style={[styles.userAvatar, { backgroundColor: accent + "22" }]}>
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                ) : (
                  <Text style={[styles.userInitials, { color: accent }]}>{getInitials(user.name, user.username)}</Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: text }]} numberOfLines={1}>
                  {user.name?.trim() || user.username}
                </Text>
                <Text style={[styles.userHandle, { color: muted }]} numberOfLines={1}>
                  @{user.username}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={muted} />
            </Pressable>
          ))}
          {userResults.length > peopleLimit && (
            <Pressable style={[styles.loadMoreBtn, { borderColor: border }]} onPress={onLoadMorePeople}>
              <Text style={[styles.loadMoreText, { color: accent }]}>Load more people</Text>
            </Pressable>
          )}
        </View>
      )}

      {hasVenueResults && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>Venues</Text>
          {venueResults.slice(0, venueLimit).map((venue) => (
            <View key={venue._id} style={[styles.venueRow, { backgroundColor: surface, borderColor: border }]}>
              <View style={[styles.venueIcon, { backgroundColor: accent + "18" }]}>
                <IconSymbol name="building.2" size={18} color={accent} />
              </View>
              <View style={styles.venueInfo}>
                <Text style={[styles.venueName, { color: text }]} numberOfLines={1}>{venue.name}</Text>
                <Text style={[styles.venueLocation, { color: muted }]} numberOfLines={1}>
                  {[venue.city, venue.state].filter(Boolean).join(", ")}
                  {venue.district ? ` · ${formatDistrict(venue.district)}` : ""}
                </Text>
              </View>
            </View>
          ))}
          {venueResults.length > venueLimit && (
            <Pressable style={[styles.loadMoreBtn, { borderColor: border }]} onPress={onLoadMoreVenues}>
              <Text style={[styles.loadMoreText, { color: accent }]}>Load more venues</Text>
            </Pressable>
          )}
        </View>
      )}

      {noResults && (
        <>
          <EmptyState icon="magnifyingglass" iconSize={36} title="No results" subtitle={`Nothing found for "${trimmed}"`} />
          <CatalogFeedbackLink
            source="search"
            linkText="Show or production missing? Let us know"
            title="Suggest a missing show"
            hint="Tell us which show or production is missing and we'll look into adding it."
            placeholder="Which show is missing?"
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  grid: { gap: GRID_GAP },
  gridRow: { flexDirection: "row", gap: GRID_GAP },
  userRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: 12, gap: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  userInitials: { fontSize: 14, fontWeight: "700" },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: "600" },
  userHandle: { fontSize: 13 },
  venueRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: 12, gap: 12 },
  venueIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  venueInfo: { flex: 1, gap: 2 },
  venueName: { fontSize: 15, fontWeight: "600" },
  venueLocation: { fontSize: 13 },
  loadMoreBtn: { alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  loadMoreText: { fontSize: 14, fontWeight: "600" },
});

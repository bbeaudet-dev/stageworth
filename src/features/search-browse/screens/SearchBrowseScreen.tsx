import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AddToListSheet } from "@/components/AddToListSheet";
import { UserCard, type UserCardUser } from "@/components/UserCard";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNavGuard } from "@/hooks/use-nav-guard";
import { useTabNav } from "@/hooks/use-tab-nav";
import {
  railBadgeForClosingSoon,
  railBadgeForProduction,
  type FullStatusBadge,
} from "@/features/browse/components/ProductionCard";
import { chunkRows } from "@/utils/arrays";
import { getInitials } from "@/utils/user";

const GRID_GAP = 8;
const GRID_COLUMNS = 4;
const SECTION_PADDING = 16;
const MIN_SEARCH_LENGTH = 2;

export default function SearchBrowseScreen() {
  const router = useRouter();
  const { pushUserProfile } = useTabNav();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: screenWidth } = useWindowDimensions();

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const bg = Colors[theme].background;
  const surface = Colors[theme].surfaceElevated;
  const border = Colors[theme].border;
  const text = Colors[theme].text;
  const muted = Colors[theme].mutedText;
  const accent = Colors[theme].accent;
  const chipBg = Colors[theme].surface;
  const posterBg = theme === "dark" ? "#27272f" : "#efefef";

  const inputRef = useRef<TextInput>(null);
  const guard = useNavGuard();

  const [query, setQuery] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  // Load-more limits per search section
  const [showLimit, setShowLimit] = useState(8);
  const [peopleLimit, setPeopleLimit] = useState(4);
  const [venueLimit, setVenueLimit] = useState(4);

  // List status sheet state
  const [listSheetShowId, setListSheetShowId] = useState<Id<"shows"> | null>(null);
  const [listSheetShowName, setListSheetShowName] = useState("");

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }, []),
  );
  const trimmed = query.trim();
  const isSearchActive = trimmed.length >= MIN_SEARCH_LENGTH;

  // Reset per-section limits whenever the search query changes
  useEffect(() => {
    setShowLimit(8);
    setPeopleLimit(4);
    setVenueLimit(4);
  }, [trimmed]);

  const showResults = useQuery(
    api.shows.search,
    isSearchActive ? { q: trimmed, limit: 24 } : "skip",
  );
  const userResults = useQuery(
    api.social.profiles.searchUsers,
    isSearchActive ? { q: trimmed } : "skip",
  );
  const venueResults = useQuery(
    api.venues.search,
    isSearchActive ? { query: trimmed } : "skip",
  );

  const currentShows = useQuery(api.productions.listCurrent, {});
  // Rail limit: first 60 days of upcoming; all closing within 10 weeks.
  // The full set is shown in the ShowGrid screen when "See All" is tapped.
  const upcomingShows = useQuery(api.productions.listUpcoming, { days: 60 });
  const closingSoon = useQuery(api.productions.listClosingSoon, { days: 70 });

  // User discovery rails (browse state only)
  const recentUsers = useQuery(
    api.social.profiles.searchUsers,
    !isSearchActive ? { q: "" } : "skip",
  );
  const topTheatregoers = useQuery(
    api.userStats.getTopTheatregoers,
    !isSearchActive ? { limit: 12 } : "skip",
  );

  // Collect all visible showIds from browse rails to batch-fetch list statuses
  const browseShowIds = useMemo<Id<"shows">[]>(() => {
    const seen = new Set<string>();
    const ids: Id<"shows">[] = [];
    const addShows = (prods?: { show: { _id: string } }[] | null) => {
      if (!prods) return;
      for (const p of prods) {
        if (!seen.has(p.show._id)) {
          seen.add(p.show._id);
          ids.push(p.show._id as Id<"shows">);
        }
      }
    };
    addShows(currentShows);
    addShows(closingSoon);
    addShows(upcomingShows);
    return ids;
  }, [currentShows, closingSoon, upcomingShows]);

  const searchShowIds = useMemo<Id<"shows">[]>(() => {
    if (!showResults?.length) return [];
    return showResults.map((s) => s._id as Id<"shows">);
  }, [showResults]);

  const allVisibleShowIds = useMemo<Id<"shows">[]>(() => {
    if (isSearchActive) return searchShowIds;
    return browseShowIds;
  }, [isSearchActive, searchShowIds, browseShowIds]);

  const listStatuses = useQuery(
    api.lists.getShowListStatuses,
    allVisibleShowIds.length > 0 ? { showIds: allVisibleShowIds } : "skip"
  );

  const getListStatus = (showId: string) => {
    if (!listStatuses) return undefined;
    const key = listStatuses[showId];
    return (key as "want_to_see" | "look_into" | "not_interested" | "uncategorized" | undefined) ?? "none";
  };

  const openListSheet = (showId: Id<"shows">, showName: string) => {
    setListSheetShowId(showId);
    setListSheetShowName(showName);
  };

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isDark = theme === "dark";

  const cardWidth = Math.floor(
    (screenWidth - SECTION_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  const handleCancel = () => {
    setQuery("");
    setInputFocused(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const navigateToShow = guard((showId: string, showName?: string) => {
    router.push({
      pathname: "/(tabs)/search/show/[showId]",
      params: { showId, name: showName, _ts: Date.now().toString() },
    });
  });

  const navigateToCategory = guard((category: string) => {
    router.push({
      pathname: "/(tabs)/search/shows/[category]",
      params: { category },
    });
  });

  const hasShowResults = showResults && showResults.length > 0;
  const hasUserResults = userResults && userResults.length > 0;
  const hasVenueResults = venueResults && venueResults.length > 0;
  const noResults =
    isSearchActive &&
    showResults !== undefined &&
    userResults !== undefined &&
    venueResults !== undefined &&
    !hasShowResults &&
    !hasUserResults &&
    !hasVenueResults;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["top"]}>
      {/* Search header */}
      <View style={styles.headerRow}>
        <View style={[styles.searchField, { backgroundColor: chipBg, borderColor: border }]}>
          <IconSymbol size={18} name="magnifyingglass" color={muted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: text }]}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Shows, people, venues..."
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
            returnKeyType="search"
          />
        </View>
        {inputFocused && (
          <Pressable onPress={handleCancel} hitSlop={8}>
            <Text style={[styles.cancelText, { color: accent }]}>Cancel</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Search results (2+ chars) ─── */}
        {isSearchActive && (
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
                          onPress={() => navigateToShow(show._id, show.name)}
                          onListIconPress={() => openListSheet(show._id as Id<"shows">, show.name)}
                        />
                      ))}
                    </View>
                  ))}
                </View>
                {showResults.length > showLimit && (
                  <Pressable
                    style={[styles.loadMoreBtn, { borderColor: border }]}
                    onPress={() => setShowLimit((n) => n + 8)}
                  >
                    <Text style={[styles.loadMoreText, { color: accent }]}>
                      Load more shows
                    </Text>
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
                    onPress={() => pushUserProfile(user.username)}
                  >
                    <View style={[styles.userAvatar, { backgroundColor: accent + "22" }]}>
                      {user.avatarUrl ? (
                        <Image
                          source={{ uri: user.avatarUrl }}
                          style={StyleSheet.absoluteFillObject}
                          contentFit="cover"
                        />
                      ) : (
                        <Text style={[styles.userInitials, { color: accent }]}>
                          {getInitials(user.name, user.username)}
                        </Text>
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
                  <Pressable
                    style={[styles.loadMoreBtn, { borderColor: border }]}
                    onPress={() => setPeopleLimit((n) => n + 8)}
                  >
                    <Text style={[styles.loadMoreText, { color: accent }]}>
                      Load more people
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {hasVenueResults && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: text }]}>Venues</Text>
                {venueResults.slice(0, venueLimit).map((venue) => (
                  <View
                    key={venue._id}
                    style={[styles.venueRow, { backgroundColor: surface, borderColor: border }]}
                  >
                    <View style={[styles.venueIcon, { backgroundColor: accent + "18" }]}>
                      <IconSymbol name="building.2" size={18} color={accent} />
                    </View>
                    <View style={styles.venueInfo}>
                      <Text style={[styles.venueName, { color: text }]} numberOfLines={1}>
                        {venue.name}
                      </Text>
                      <Text style={[styles.venueLocation, { color: muted }]} numberOfLines={1}>
                        {[venue.city, venue.state].filter(Boolean).join(", ")}
                        {venue.district ? ` · ${formatDistrict(venue.district)}` : ""}
                      </Text>
                    </View>
                  </View>
                ))}
                {venueResults.length > venueLimit && (
                  <Pressable
                    style={[styles.loadMoreBtn, { borderColor: border }]}
                    onPress={() => setVenueLimit((n) => n + 8)}
                  >
                    <Text style={[styles.loadMoreText, { color: accent }]}>
                      Load more venues
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {noResults && (
              <EmptyState icon="magnifyingglass" iconSize={36} title="No results" subtitle={`Nothing found for "${trimmed}"`} />
            )}
          </>
        )}

        {/* ─── Default browse content — always visible unless showing results ─── */}
        {!isSearchActive && (
          <>
            {/* Quick actions */}
            <View style={styles.quickActionsRow}>
              <Pressable
                style={[styles.quickAction, { backgroundColor: surface, borderColor: border }]}
                onPress={() => router.push("/add-visit")}
              >
                <IconSymbol name="plus.circle.fill" size={16} color={accent} />
                <Text style={[styles.quickActionText, { color: text }]}>Add Visit</Text>
              </Pressable>
              <Pressable
                style={[styles.quickAction, { backgroundColor: surface, borderColor: border }]}
                onPress={() =>
                  router.push({ pathname: "/(tabs)/plan", params: { createTrip: "1" } })
                }
              >
                <IconSymbol name="airplane" size={16} color={accent} />
                <Text style={[styles.quickActionText, { color: text }]}>New Trip</Text>
              </Pressable>
              <Pressable
                style={[styles.quickAction, { backgroundColor: surface, borderColor: border }]}
                onPress={() =>
                  router.push({ pathname: "/(tabs)/plan", params: { createList: "1" } })
                }
              >
                <IconSymbol name="list.bullet" size={16} color={accent} />
                <Text style={[styles.quickActionText, { color: text }]}>New List</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.seeAllButton}
              onPress={() => navigateToCategory("all")}
            >
              <Text style={[styles.seeAllText, { color: accent }]}>See All Shows</Text>
              <IconSymbol name="chevron.right" size={14} color={accent} />
            </Pressable>

            {currentShows && currentShows.length > 0 && (
              <BrowseRail
                title="Now Playing"
                items={currentShows.map((p) => ({
                  _id: p._id,
                  show: p.show,
                  posterUrl: p.posterUrl,
                }))}
                cardWidth={cardWidth}
                surfaceColor={surface}
                posterBg={posterBg}
                textColor={text}
                mutedColor={muted}
                accentColor={accent}
                onPress={navigateToShow}
                onSeeMore={() => navigateToCategory("now-playing")}
                listStatuses={listStatuses ?? {}}
                onListIconPress={openListSheet}
              />
            )}

            {closingSoon && closingSoon.length > 0 && (
              <BrowseRail
                title="Closing Soon"
                items={closingSoon.map((p) => ({
                  _id: p._id,
                  show: p.show,
                  posterUrl: p.posterUrl,
                  badge: railBadgeForClosingSoon(p, isDark, todayStr),
                }))}
                cardWidth={cardWidth}
                surfaceColor={surface}
                posterBg={posterBg}
                textColor={text}
                mutedColor={muted}
                accentColor={accent}
                onPress={navigateToShow}
                onSeeMore={() => navigateToCategory("closing-soon")}
                listStatuses={listStatuses ?? {}}
                onListIconPress={openListSheet}
              />
            )}

            {upcomingShows && upcomingShows.length > 0 && (
              <BrowseRail
                title="Upcoming"
                items={upcomingShows.map((p) => ({
                  _id: p._id,
                  show: p.show,
                  posterUrl: p.posterUrl,
                  badge: railBadgeForProduction(p, isDark, todayStr),
                }))}
                cardWidth={cardWidth}
                surfaceColor={surface}
                posterBg={posterBg}
                textColor={text}
                mutedColor={muted}
                accentColor={accent}
                onPress={navigateToShow}
                onSeeMore={() => navigateToCategory("upcoming")}
                listStatuses={listStatuses ?? {}}
                onListIconPress={openListSheet}
              />
            )}

            {/* ─── User discovery rails ─── */}
            {recentUsers && recentUsers.length > 0 && (
              <UserRail
                title="New to the House"
                users={recentUsers.slice(0, 10) as UserCardUser[]}
                textColor={text}
                onPressUser={(username) => pushUserProfile(username)}
              />
            )}

            {topTheatregoers && topTheatregoers.length > 0 && (
              <UserRail
                title="Top of the Bill"
                users={topTheatregoers as UserCardUser[]}
                textColor={text}
                onPressUser={(username) => pushUserProfile(username)}
              />
            )}

            {/* See Leaderboard link */}
            {(topTheatregoers ?? recentUsers) && (
              <Pressable
                style={styles.seeAllButton}
                onPress={() => router.push("/(tabs)/community/leaderboard")}
              >
                <Text style={[styles.seeAllText, { color: accent }]}>See Leaderboard</Text>
                <IconSymbol name="chevron.right" size={14} color={accent} />
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    <AddToListSheet
      visible={listSheetShowId !== null}
      showId={listSheetShowId}
      showName={listSheetShowName}
      onClose={() => setListSheetShowId(null)}
    />
    </KeyboardAvoidingView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── UserRail ────────────────────────────────────────────────────────────────

function UserRail({
  title,
  users,
  textColor,
  onPressUser,
}: {
  title: string;
  users: UserCardUser[];
  textColor: string;
  onPressUser: (username: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {users.map((user) => (
          <UserCard
            key={user._id}
            user={user}
            width={88}
            onPress={() => onPressUser(user.username)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── BrowseRail ──────────────────────────────────────────────────────────────

type BrowseItem = {
  _id: string;
  show: { _id: string; name: string; images: string[] };
  posterUrl?: string | null;
  badge?: FullStatusBadge | null;
};

function BrowseRail({
  title,
  items,
  cardWidth,
  surfaceColor,
  posterBg,
  textColor,
  mutedColor,
  accentColor,
  onPress,
  onSeeMore,
  listStatuses,
  onListIconPress,
}: {
  title: string;
  items: BrowseItem[];
  cardWidth: number;
  surfaceColor: string;
  posterBg: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  onPress: (showId: string, showName?: string) => void;
  onSeeMore?: () => void;
  listStatuses?: Record<string, string>;
  onListIconPress?: (showId: Id<"shows">, showName: string) => void;
}) {
  const seen = new Set<string>();
  const unique = items.filter((p) => {
    if (seen.has(p.show._id)) return false;
    seen.add(p.show._id);
    return true;
  });

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
        {onSeeMore && (
          <Pressable onPress={onSeeMore} hitSlop={8}>
            <Text style={[styles.seeMoreText, { color: accentColor }]}>See All</Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {unique.map((prod) => {
          const image = prod.posterUrl ?? prod.show.images[0] ?? null;
          const rawStatus = listStatuses?.[prod.show._id];
          const listStatus = (rawStatus as "want_to_see" | "look_into" | "not_interested" | "uncategorized" | undefined) ?? "none";
          return (
            <SearchShowCard
              key={prod._id}
              show={{ name: prod.show.name, images: prod.show.images, image, badge: prod.badge }}
              cardWidth={cardWidth}
              surfaceColor={surfaceColor}
              posterBg={posterBg}
              mutedColor={mutedColor}
              listStatus={listStatus}
              onPress={() => onPress(prod.show._id, prod.show.name)}
              onListIconPress={onListIconPress ? () => onListIconPress(prod.show._id as Id<"shows">, prod.show.name) : undefined}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Small show card used in the Search tab for both search results and browse rails.
 * Shows list status icon in the top-right corner.
 */
function SearchShowCard({
  show,
  cardWidth,
  surfaceColor,
  posterBg,
  mutedColor,
  listStatus,
  onPress,
  onListIconPress,
}: {
  show: { name: string; images?: string[]; image?: string | null; badge?: FullStatusBadge | null };
  cardWidth: number;
  surfaceColor: string;
  posterBg: string;
  mutedColor: string;
  listStatus?: "want_to_see" | "look_into" | "not_interested" | "uncategorized" | "none";
  onPress: () => void;
  onListIconPress?: () => void;
}) {
  const image = show.image ?? show.images?.[0] ?? null;
  return (
    <Pressable
      style={[styles.playbillCard, { width: cardWidth, backgroundColor: surfaceColor }]}
      onPress={onPress}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={[styles.playbillImg, { backgroundColor: posterBg }]}
          contentFit="contain"
        />
      ) : (
        <View style={[styles.playbillImg, styles.playbillFb, { backgroundColor: posterBg }]}>
          <Text
            style={[styles.playbillFbText, { color: mutedColor }]}
            numberOfLines={4}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {show.name}
          </Text>
        </View>
      )}
      {show.badge ? (
        <View style={show.badge.secondary ? styles.railBadgeOverlay : undefined}>
          {show.badge.secondary ? (
            <View style={[styles.railBadgeStrip, styles.railBadgeSecondary, { backgroundColor: show.badge.secondary.bg }]}>
              <Text style={[styles.railBadgeText, { color: show.badge.secondary.text }]}>
                {show.badge.secondary.label}
              </Text>
            </View>
          ) : null}
          <View style={[styles.railBadgeStrip, { backgroundColor: show.badge.primary.bg }]}>
            <Text style={[styles.railBadgeText, { color: show.badge.primary.text }]}>
              {show.badge.primary.label}
            </Text>
          </View>
        </View>
      ) : null}
      {listStatus != null && onListIconPress ? (
        <ListStatusIcon status={listStatus} onPress={onListIconPress} />
      ) : null}
    </Pressable>
  );
}

function ListStatusIcon({
  status,
  onPress,
}: {
  status: "want_to_see" | "look_into" | "not_interested" | "uncategorized" | "none";
  onPress: () => void;
}) {
  const icon = (() => {
    switch (status) {
      case "want_to_see":    return "hand.thumbsup";
      case "look_into":      return "questionmark.circle";
      case "not_interested": return "hand.thumbsdown";
      case "uncategorized":  return "minus.circle";
      default:               return "bookmark";
    }
  })();
  return (
    <Pressable
      style={styles.listIconBtn}
      onPress={(e) => { e.stopPropagation?.(); onPress(); }}
      hitSlop={6}
    >
      <IconSymbol name={icon as any} size={14} color="#fff" />
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SECTION_PADDING,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 12,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: SECTION_PADDING,
    gap: 20,
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  quickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Sections
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // See all shows
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 2,
    marginVertical: -6,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Grid (search results)
  grid: {
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },

  // Playbill cards
  playbillCard: {
    borderRadius: 10,
    overflow: "hidden",
  },
  playbillImg: {
    width: "100%",
    aspectRatio: 2 / 3,
  },
  playbillFb: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  railBadgeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  railBadgeStrip: {
    width: "100%",
    paddingVertical: 4,
    alignItems: "center",
  },
  railBadgeSecondary: {
    opacity: 0.85,
    paddingVertical: 3,
  },
  railBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  listIconBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    alignItems: "center",
    justifyContent: "center",
    // Drop shadow makes the outline icon readable over any poster colour
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  playbillFbText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // Rail
  railContent: {
    gap: GRID_GAP,
    paddingRight: SECTION_PADDING,
  },

  // User rows
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  userInitials: {
    fontSize: 14,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
  },
  userHandle: {
    fontSize: 13,
  },

  // Venue rows
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  venueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  venueInfo: {
    flex: 1,
    gap: 2,
  },
  venueName: {
    fontSize: 15,
    fontWeight: "600",
  },
  venueLocation: {
    fontSize: 13,
  },

  // Load more
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },

});

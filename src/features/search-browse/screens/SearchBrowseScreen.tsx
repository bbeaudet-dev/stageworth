import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
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
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNavGuard } from "@/hooks/use-nav-guard";
import { useTabNav } from "@/hooks/use-tab-nav";
import {
  railBadgeForClosingSoon,
  railBadgeForProduction,
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

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }, []),
  );
  const trimmed = query.trim();
  const isSearchActive = trimmed.length >= MIN_SEARCH_LENGTH;

  const showResults = useQuery(
    api.shows.search,
    isSearchActive ? { q: trimmed, limit: 12 } : "skip",
  );
  const userResults = useQuery(
    api.social.profiles.searchUsers,
    isSearchActive ? { q: trimmed } : "skip",
  );

  const currentShows = useQuery(api.productions.listCurrent, {});
  const upcomingShows = useQuery(api.productions.listUpcoming, { days: 90 });
  const closingSoon = useQuery(api.productions.listClosingSoon, { days: 30 });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isDark = theme === "dark";

  const cardWidth = Math.floor(
    (screenWidth - SECTION_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  const handleCancel = () => {
    setQuery("");
    setInputFocused(false);
    inputRef.current?.blur();
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
  const noResults = isSearchActive && showResults !== undefined && userResults !== undefined
    && !hasShowResults && !hasUserResults;

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
            placeholder="Shows, people, productions..."
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
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
        keyboardShouldPersistTaps="always"
      >
        {/* ─── Search results (2+ chars) ─── */}
        {isSearchActive && (
          <>
            {hasShowResults && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: text }]}>Shows</Text>
                <View style={styles.grid}>
                  {chunkRows(showResults.slice(0, 8), GRID_COLUMNS).map((row, ri) => (
                    <View key={ri} style={styles.gridRow}>
                      {row.map((show) => (
                        <Pressable
                          key={show._id}
                          style={[styles.playbillCard, { width: cardWidth, backgroundColor: surface }]}
                          onPress={() => navigateToShow(show._id, show.name)}
                        >
                          {show.images[0] ? (
                            <Image
                              source={{ uri: show.images[0] }}
                              style={[styles.playbillImg, { backgroundColor: posterBg }]}
                              contentFit="contain"
                            />
                          ) : (
                            <View style={[styles.playbillImg, styles.playbillFb, { backgroundColor: posterBg }]}>
                              <Text
                                style={[styles.playbillFbText, { color: muted }]}
                                numberOfLines={4}
                                adjustsFontSizeToFit
                                minimumFontScale={0.6}
                              >
                                {show.name}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {hasUserResults && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: text }]}>People</Text>
                {userResults.slice(0, 6).map((user) => (
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
              />
            )}

            {upcomingShows && upcomingShows.length > 0 && (
              <BrowseRail
                title="Coming Soon"
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
                onSeeMore={() => navigateToCategory("coming-soon")}
              />
            )}

            <Pressable
              style={styles.seeAllButton}
              onPress={() => navigateToCategory("all")}
            >
              <Text style={[styles.seeAllText, { color: accent }]}>See All Shows</Text>
              <IconSymbol name="chevron.right" size={14} color={accent} />
            </Pressable>

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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── BrowseRail ──────────────────────────────────────────────────────────────

type BrowseItem = {
  _id: string;
  show: { _id: string; name: string; images: string[] };
  posterUrl?: string | null;
  badge?: { label: string; bg: string; text: string } | null;
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
          return (
            <Pressable
              key={prod._id}
              style={[styles.playbillCard, { width: cardWidth, backgroundColor: surfaceColor }]}
              onPress={() => onPress(prod.show._id, prod.show.name)}
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={[styles.playbillImg, { backgroundColor: posterBg }]}
                  contentFit="contain"
                />
              ) : (
                <View
                  style={[styles.playbillImg, styles.playbillFb, { backgroundColor: posterBg }]}
                >
                  <Text
                    style={[styles.playbillFbText, { color: mutedColor }]}
                    numberOfLines={4}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {prod.show.name}
                  </Text>
                </View>
              )}
              {prod.badge ? (
                <View style={[styles.railBadgeStrip, { backgroundColor: prod.badge.bg }]}>
                  <Text style={[styles.railBadgeText, { color: prod.badge.text }]}>
                    {prod.badge.label}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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
    paddingVertical: 14,
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
  railBadgeStrip: {
    width: "100%",
    paddingVertical: 4,
    alignItems: "center",
  },
  railBadgeText: {
    fontSize: 9,
    fontWeight: "700",
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

});

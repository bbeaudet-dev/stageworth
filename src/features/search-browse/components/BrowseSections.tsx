import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { UserCard, type UserCardUser } from "@/components/UserCard";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import {
  railBadgeForClosingSoon,
  railBadgeForProduction,
  type FullStatusBadge,
} from "@/features/browse/components/ProductionCard";
import { SearchShowCard } from "@/features/search-browse/components/SearchShowCard";
import { PlanActionRow } from "@/features/plan/components/PlanActionRow";
import { useColorScheme } from "@/hooks/use-color-scheme";

const GRID_GAP = 8;
const SECTION_PADDING = 16;

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
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

function UserRail({
  title,
  users,
  textColor,
  accentColor,
  onPressUser,
  onSeeLeaderboard,
}: {
  title: string;
  users: UserCardUser[];
  textColor: string;
  accentColor?: string;
  onPressUser: (username: string) => void;
  onSeeLeaderboard?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
        {onSeeLeaderboard && accentColor && (
          <Pressable onPress={onSeeLeaderboard} hitSlop={8}>
            <Text style={[styles.seeMoreText, { color: accentColor }]}>See Leaderboard</Text>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userRailContent}>
        {users.map((user) => (
          <UserCard key={user._id} user={user} width={76} onPress={() => onPressUser(user.username)} />
        ))}
      </ScrollView>
    </View>
  );
}

interface BrowseSectionsProps {
  currentShows: { _id: string; show: { _id: string; name: string; images: string[] }; posterUrl?: string | null }[] | undefined;
  closingSoon: { _id: string; show: { _id: string; name: string; images: string[] }; posterUrl?: string | null; closingDate?: string | null; previewDate?: string; openingDate?: string }[] | undefined;
  upcomingShows: { _id: string; show: { _id: string; name: string; images: string[] }; posterUrl?: string | null; previewDate?: string; openingDate?: string; closingDate?: string | null; isOpenRun?: boolean | null }[] | undefined;
  recentUsers: UserCardUser[] | undefined;
  topTheatregoers: UserCardUser[] | undefined;
  cardWidth: number;
  listStatuses: Record<string, string> | undefined;
  todayStr: string;
  isDark: boolean;
  navigateToShow: (showId: string, showName?: string) => void;
  navigateToCategory: (category: string) => void;
  openListSheet: (showId: Id<"shows">, showName: string) => void;
}

export function BrowseSections({
  currentShows,
  closingSoon,
  upcomingShows,
  recentUsers,
  topTheatregoers,
  cardWidth,
  listStatuses,
  todayStr,
  isDark,
  navigateToShow,
  navigateToCategory,
  openListSheet,
}: BrowseSectionsProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const surface = Colors[theme].surfaceElevated;
  const border = Colors[theme].border;
  const text = Colors[theme].text;
  const muted = Colors[theme].mutedText;
  const accent = Colors[theme].accent;
  const posterBg = theme === "dark" ? "#27272f" : "#efefef";

  return (
    <>
      <PlanActionRow />

      {currentShows && currentShows.length > 0 && (
        <BrowseRail
          title="Now Playing"
          items={currentShows.map((p) => ({ _id: p._id, show: p.show, posterUrl: p.posterUrl }))}
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
          items={closingSoon.map((p) => ({ _id: p._id, show: p.show, posterUrl: p.posterUrl, badge: railBadgeForClosingSoon(p, isDark, todayStr) }))}
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
          items={upcomingShows.map((p) => ({ _id: p._id, show: p.show, posterUrl: p.posterUrl, badge: railBadgeForProduction({ ...p, closingDate: p.closingDate ?? undefined }, isDark, todayStr) }))}
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

      <Pressable style={styles.seeAllButton} onPress={() => navigateToCategory("all")}>
        <Text style={[styles.seeAllText, { color: accent }]}>See All Shows</Text>
        <IconSymbol name="chevron.right" size={14} color={accent} />
      </Pressable>

      {recentUsers && recentUsers.length > 0 && (
        <UserRail
          title="New to the House"
          users={recentUsers.slice(0, 10) as UserCardUser[]}
          textColor={text}
          onPressUser={(username) => router.push({ pathname: "/user/[username]", params: { username } })}
        />
      )}

      {topTheatregoers && topTheatregoers.length > 0 && (
        <UserRail
          title="Top of the Bill"
          users={topTheatregoers as UserCardUser[]}
          textColor={text}
          accentColor={accent}
          onPressUser={(username) => router.push({ pathname: "/user/[username]", params: { username } })}
          onSeeLeaderboard={() => router.push("/leaderboard")}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  seeMoreText: { fontSize: 14, fontWeight: "600" },
  seeAllButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 2, marginVertical: -6 },
  seeAllText: { fontSize: 15, fontWeight: "600" },
  railContent: { gap: GRID_GAP, paddingRight: SECTION_PADDING },
  userRailContent: { gap: 6, paddingRight: SECTION_PADDING },
});

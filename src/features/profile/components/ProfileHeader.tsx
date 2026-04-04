import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { shouldUseOauthProfileImageUrl } from "@/utils/oauthProfilePhoto";

export function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export interface ProfileHeaderData {
  username: string;
  name?: string | null;
  bio?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  followerCount: number;
  followingCount: number;
  viewerIsSelf: boolean;
  viewerFollows: boolean;
}

interface ProfileHeaderProps {
  profile: ProfileHeaderData;
  /** Fills the gap before Convex profile name syncs (e.g. OAuth display name from Better Auth). */
  sessionDisplayName?: string | null;
  /** Provider profile image when user has no Convex `avatarUrl` (filtered — see `shouldUseOauthProfileImageUrl`). */
  sessionAvatarUrl?: string | null;
  onFollowToggle?: () => void;
  followPending?: boolean;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
  stats?: {
    uniqueShowCount: number;
    totalVisitCount: number;
  } | null;
  theatreRank?: number | null;
  streakWeeks?: number | null;
  activitySummary?: {
    showCount: number;
    typeCount: number;
    percentile: number;
    locationLabel?: string | null;
  } | null;
}

export function ProfileHeader({
  profile,
  sessionDisplayName,
  sessionAvatarUrl,
  onFollowToggle,
  followPending,
  onPressFollowers,
  onPressFollowing,
  stats,
  theatreRank,
  streakWeeks,
  activitySummary,
}: ProfileHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;

  const displayName =
    profile.name?.trim() ||
    sessionDisplayName?.trim() ||
    profile.username ||
    "User";
  const oauthAvatar =
    shouldUseOauthProfileImageUrl(sessionAvatarUrl) ? sessionAvatarUrl : null;
  const avatarUri = profile.avatarUrl ?? oauthAvatar ?? null;
  const showFollowBtn = !profile.viewerIsSelf && !!onFollowToggle;

  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUri]);

  const showPhoto = Boolean(avatarUri) && !avatarLoadFailed;

  return (
    <>
      {/* Hero card */}
      <View style={[styles.heroCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: accentColor + "22" }]}>
            {showPhoto && avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <IconSymbol name="person.fill" size={34} color={accentColor} />
            )}
          </View>

          <View style={styles.infoColumn}>
            <Text style={[styles.displayName, { color: primaryTextColor }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.handle, { color: mutedTextColor }]}>
              @{profile.username}
            </Text>

            <View style={styles.followRow}>
              <Pressable style={styles.followStat} onPress={onPressFollowers}>
                <Text style={[styles.followStatNumber, { color: primaryTextColor }]}>
                  {profile.followerCount}
                </Text>
                <Text style={[styles.followStatLabel, { color: mutedTextColor }]}>
                  {" "}Followers
                </Text>
              </Pressable>
              <Text style={[styles.followStatDot, { color: mutedTextColor }]}> · </Text>
              <Pressable style={styles.followStat} onPress={onPressFollowing}>
                <Text style={[styles.followStatNumber, { color: primaryTextColor }]}>
                  {profile.followingCount}
                </Text>
                <Text style={[styles.followStatLabel, { color: mutedTextColor }]}>
                  {" "}Following
                </Text>
              </Pressable>

              {showFollowBtn && (
                <Pressable
                  style={[
                    styles.followBtn,
                    profile.viewerFollows
                      ? {
                          backgroundColor: "transparent",
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor,
                        }
                      : { backgroundColor: accentColor },
                    followPending && styles.followBtnDisabled,
                  ]}
                  onPress={onFollowToggle}
                  disabled={followPending}
                >
                  {followPending ? (
                    <ActivityIndicator
                      size="small"
                      color={profile.viewerFollows ? mutedTextColor : onAccent}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.followBtnText,
                        { color: profile.viewerFollows ? primaryTextColor : onAccent },
                      ]}
                    >
                      {profile.viewerFollows ? "Following" : "Follow"}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {profile.bio ? (
          <Text style={[styles.bio, { color: primaryTextColor }]}>
            {profile.bio}
          </Text>
        ) : null}
        {profile.location ? (
          <Text style={[styles.location, { color: mutedTextColor }]}>
            {profile.location}
          </Text>
        ) : null}
      </View>

      {/* Stats card */}
      <View style={[styles.statsCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={styles.statsGrid}>
          <View style={styles.statsGridItem}>
            <Text style={[styles.statsGridNumber, { color: primaryTextColor }]}>
              {stats?.uniqueShowCount ?? "—"}
            </Text>
            <Text style={[styles.statsGridLabel, { color: mutedTextColor }]}>
              Shows
            </Text>
          </View>
          <View style={[styles.statsGridDivider, { backgroundColor: borderColor }]} />
          <View style={styles.statsGridItem}>
            <Text style={[styles.statsGridNumber, { color: primaryTextColor }]}>
              {stats?.totalVisitCount ?? "—"}
            </Text>
            <Text style={[styles.statsGridLabel, { color: mutedTextColor }]}>
              Visits
            </Text>
          </View>
          <View style={[styles.statsGridDivider, { backgroundColor: borderColor }]} />
          <View style={styles.statsGridItem}>
            <Text
              style={[
                styles.statsGridNumber,
                { color: theatreRank != null ? primaryTextColor : mutedTextColor },
              ]}
            >
              {theatreRank != null ? `#${theatreRank}` : "—"}
            </Text>
            <Text style={[styles.statsGridLabel, { color: mutedTextColor }]}>
              Rank
            </Text>
          </View>
        </View>
      </View>

      {/* Combined activity card: streak + percentile snapshot */}
      {((streakWeeks != null && streakWeeks > 0) || (activitySummary && activitySummary.showCount > 0)) && (
        <View style={[styles.activityCard, { backgroundColor: surfaceColor, borderColor }]}>
          {streakWeeks != null && streakWeeks > 0 && (
            <View style={styles.activityRow}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={[styles.activityPrimary, { color: primaryTextColor }]}>
                {streakWeeks} {streakWeeks === 1 ? "week" : "weeks"} streak
              </Text>
            </View>
          )}
          {streakWeeks != null && streakWeeks > 0 && activitySummary && activitySummary.showCount > 0 && (
            <View style={[styles.activityDivider, { backgroundColor: borderColor }]} />
          )}
          {activitySummary && activitySummary.showCount > 0 && (
            <>
              <View style={styles.activityRow}>
                <Text style={[styles.activityPrimary, { color: primaryTextColor }]}>
                  Top {100 - activitySummary.percentile}% theatregoer
                </Text>
              </View>
              <Text style={[styles.activitySub, { color: mutedTextColor }]}>
                {activitySummary.showCount} {activitySummary.showCount === 1 ? "show" : "shows"}
                {" · "}
                {activitySummary.typeCount} {activitySummary.typeCount === 1 ? "genre" : "genres"}
                {activitySummary.locationLabel ? ` in ${activitySummary.locationLabel}` : " this month"}
              </Text>
            </>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  infoColumn: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 17,
    fontWeight: "700",
  },
  handle: {
    fontSize: 13,
    fontWeight: "500",
  },
  followRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
    gap: 0,
  },
  followStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  followStatNumber: {
    fontSize: 13,
    fontWeight: "700",
  },
  followStatLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  followStatDot: {
    fontSize: 13,
  },
  followBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnDisabled: {
    opacity: 0.6,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  location: {
    fontSize: 13,
    marginTop: 2,
  },
  statsCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  statsGridItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statsGridNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  statsGridLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statsGridDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  activityCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  activityDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  activityPrimary: {
    fontSize: 15,
    fontWeight: "700",
  },
  activitySub: {
    fontSize: 13,
    fontWeight: "500",
  },
  streakEmoji: {
    fontSize: 17,
    fontFamily: undefined,
  },
});

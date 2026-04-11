import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTripData } from "@/features/plan/hooks/useTripData";
import type { TripDetail, TripMember, FollowingUser, SearchUser } from "@/features/plan/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInitials, getDisplayName } from "@/utils/user";

// ─── constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "edit", label: "Editor" },
  { value: "view", label: "Viewer" },
];

// ─── component ────────────────────────────────────────────────────────────────

interface TripPartyTabProps {
  trip: TripDetail;
  tripId: Id<"trips">;
  onViewUser: (username: string) => void;
}

export function TripPartyTab({ trip, tripId, onViewUser }: TripPartyTabProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const chipBg = Colors[theme].surface;
  const dangerColor = Colors[theme].danger;

  // ── On This Trip expanded row ───────────────────────────────────────────────
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // ── Add to Party — friends chip section ────────────────────────────────────
  const [pendingAdd, setPendingAdd] = useState<{ _id: Id<"users">; name: string } | null>(null);
  const [pendingFriendRole, setPendingFriendRole] = useState<"edit" | "view">("edit");
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // ── Add to Party — search section ──────────────────────────────────────────
  const [otherQuery, setOtherQuery] = useState("");
  const [expandedSearchUserId, setExpandedSearchUserId] = useState<string | null>(null);
  const [expandedSearchRole, setExpandedSearchRole] = useState<"edit" | "view">("edit");
  const [addingSearchUserId, setAddingSearchUserId] = useState<string | null>(null);

  const myFollowing = useQuery(api.social.social.listMyFollowing, {});
  const myUserId = useQuery(api.auth.getConvexUserIdQuery);
  const searchResults = useQuery(api.social.profiles.searchUsers, {
    q: otherQuery.trim(),
  });

  const { addTripMember, removeTripMember, updateTripMemberRole } = useTripData();

  const existingMemberUserIds = new Set((trip?.members ?? []).map((m: TripMember) => String(m.userId)));
  const friendsNotYetMembers = (myFollowing ?? []).filter((f: FollowingUser) => !existingMemberUserIds.has(String(f._id)));

  const tripSearchRows = useMemo(() => {
    const rows = searchResults ?? [];
    if (!myUserId) return rows;
    return rows.filter(
      (u: { _id: Id<"users"> }) =>
        u._id !== myUserId && !existingMemberUserIds.has(String(u._id))
    );
  }, [searchResults, myUserId, existingMemberUserIds]);


  // ── handlers ───────────────────────────────────────────────────────────────

  const handleAddFriend = async () => {
    if (!pendingAdd) return;
    setIsAddingFriend(true);
    try {
      await addTripMember({ tripId, userId: pendingAdd._id, role: pendingFriendRole });
      setPendingAdd(null);
      setPendingFriendRole("edit");
    } catch {
      Alert.alert("Error", "Could not add member.");
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleAddBySearch = async (userId: Id<"users">) => {
    setAddingSearchUserId(String(userId));
    try {
      await addTripMember({ tripId, userId, role: expandedSearchRole });
      setOtherQuery("");
      setExpandedSearchUserId(null);
      setExpandedSearchRole("edit");
    } catch {
      Alert.alert("Error", "Could not add member.");
    } finally {
      setAddingSearchUserId(null);
    }
  };

  const toggleSearchRow = (userId: string) => {
    if (expandedSearchUserId === userId) {
      setExpandedSearchUserId(null);
    } else {
      setExpandedSearchUserId(userId);
      setExpandedSearchRole("edit");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 80 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── ON THIS TRIP ─────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: mutedTextColor }]}>ON THIS TRIP</Text>

      {/* Owner row */}
      <Pressable
        style={[styles.memberCard, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() => trip.owner?.username && !trip.isOwner ? onViewUser(trip.owner.username) : undefined}
      >
        <View style={styles.memberCardMain}>
          <View style={[styles.memberAvatar, { backgroundColor: accentColor + "22" }]}>
            {trip.owner?.avatarUrl
              ? <Image source={{ uri: trip.owner.avatarUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              : <Text style={[styles.memberInitials, { color: accentColor }]}>{getInitials(trip.owner?.name, trip.owner?.username)}</Text>}
          </View>
          <View style={styles.memberInfo}>
            {trip.owner?.name ? <Text style={[styles.memberName, { color: primaryTextColor }]}>{trip.owner.name}</Text> : null}
            <Text style={[styles.memberUsername, { color: mutedTextColor }]}>@{trip.owner?.username}</Text>
          </View>
          <View style={[styles.rolePill, { backgroundColor: accentColor + "18", borderColor: accentColor + "55" }]}>
            <Text style={[styles.rolePillText, { color: accentColor }]}>Organizer</Text>
          </View>
        </View>
      </Pressable>

      {/* Member rows */}
      {trip.members.map((m: TripMember) => {
        const isExpanded = expandedMemberId === String(m._id);

        const { pillBg, pillBorder, pillText, pillLabel } = (() => {
          if (m.status === "pending") {
            return { pillBg: "#F59E0B18", pillBorder: "#F59E0B55", pillText: "#F59E0B", pillLabel: "Invited" };
          }
          if (m.status === "declined") {
            return { pillBg: dangerColor + "18", pillBorder: dangerColor + "55", pillText: dangerColor, pillLabel: "Declined" };
          }
          if (m.role === "edit") {
            return { pillBg: accentColor + "18", pillBorder: accentColor + "55", pillText: accentColor, pillLabel: "Can Edit" };
          }
          return { pillBg: chipBg, pillBorder: borderColor, pillText: mutedTextColor, pillLabel: "View Only" };
        })();

        // Organizer can expand accepted members (role change + remove)
        // and pending members (revoke invite). Declined rows are not expandable.
        const canExpand = trip.isOwner && (m.status === "accepted" || m.status === "pending");

        return (
          <Pressable
            key={String(m._id)}
            style={[styles.memberCard, { backgroundColor: surfaceColor, borderColor }]}
            onPress={canExpand ? () => setExpandedMemberId(isExpanded ? null : String(m._id)) : undefined}
          >
            <View style={styles.memberCardMain}>
              <Pressable onPress={() => m.user?.username ? onViewUser(m.user.username) : undefined} hitSlop={4}>
                <View style={[styles.memberAvatar, { backgroundColor: accentColor + "22" }]}>
                  {m.user?.avatarUrl
                    ? <Image source={{ uri: m.user.avatarUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    : <Text style={[styles.memberInitials, { color: accentColor }]}>{getInitials(m.user?.name, m.user?.username)}</Text>}
                </View>
              </Pressable>
              <View style={styles.memberInfo}>
                {m.user?.name ? <Text style={[styles.memberName, { color: primaryTextColor }]}>{m.user.name}</Text> : null}
                <Text style={[styles.memberUsername, { color: mutedTextColor }]}>@{m.user?.username}</Text>
              </View>
              <View style={[styles.rolePill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
                <Text style={[styles.rolePillText, { color: pillText }]}>{pillLabel}</Text>
              </View>
              {canExpand && (
                <IconSymbol
                  name={isExpanded ? "chevron.up" : "chevron.down"}
                  size={12}
                  color={mutedTextColor}
                />
              )}
            </View>

            {isExpanded && trip.isOwner && (
              <View style={[styles.memberExpanded, { borderTopColor: borderColor }]}>
                {m.status === "pending" ? (
                  /* Pending (invited but not yet accepted) — only option is revoke */
                  <Pressable
                    style={[styles.revokeBtn, { borderColor: dangerColor + "44" }]}
                    onPress={() => {
                      const name = m.user?.name || m.user?.username || "this invite";
                      Alert.alert(
                        "Revoke Invite",
                        `Revoke the invite sent to ${name}?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Revoke",
                            style: "destructive",
                            onPress: () => { removeTripMember({ tripId, memberId: m._id }); setExpandedMemberId(null); },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.removeBtnText, { color: dangerColor }]}>Revoke Invite</Text>
                  </Pressable>
                ) : (
                  /* Accepted member — role selector + remove */
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedSegmentWrap}>
                      <SegmentedControl
                        options={ROLE_OPTIONS}
                        value={m.role}
                        onChange={(role) => {
                          const newRole = role as "edit" | "view";
                          if (newRole === m.role) return;
                          const roleName = newRole === "edit" ? "Editor" : "Viewer";
                          const memberName = m.user?.name || m.user?.username || "this member";
                          Alert.alert(
                            "Change Permission",
                            `Change ${memberName} to ${roleName}?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Confirm", onPress: () => updateTripMemberRole({ tripId, memberId: m._id, role: newRole }) },
                            ]
                          );
                        }}
                        accentColor={accentColor}
                      />
                    </View>
                    <Pressable
                      style={[styles.removeBtn, { borderColor: dangerColor + "44" }]}
                      onPress={() => {
                        const name = m.user?.name || m.user?.username || "member";
                        Alert.alert(`Remove ${name}?`, "", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Remove", style: "destructive", onPress: () => { removeTripMember({ tripId, memberId: m._id }); setExpandedMemberId(null); } },
                        ]);
                      }}
                    >
                      <Text style={[styles.removeBtnText, { color: dangerColor }]}>Remove</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}

      {/* ── ADD TO PARTY (owner only) ─────────────────────────────────────── */}
      {trip.isOwner ? (
        <>
          <Text style={[styles.sectionLabel, { color: mutedTextColor, marginTop: 20 }]}>ADD TO PARTY</Text>
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>

            {/* Friends chips */}
            {friendsNotYetMembers.length > 0 && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendChipRow}>
                  {friendsNotYetMembers.map((user: FollowingUser) => {
                    const isPending = pendingAdd?._id === user._id;
                    return (
                      <Pressable
                        key={String(user._id)}
                        style={[styles.friendChip, { backgroundColor: isPending ? accentColor : chipBg, borderColor: isPending ? accentColor : borderColor }]}
                        onPress={() => {
                          if (isPending) {
                            setPendingAdd(null);
                          } else {
                            setPendingAdd({ _id: user._id, name: getDisplayName(user.name, user.username) });
                            setPendingFriendRole("edit");
                          }
                        }}
                      >
                        {user.avatarUrl
                          ? <Image source={{ uri: user.avatarUrl }} style={styles.friendChipAvatar} contentFit="cover" />
                          : <View style={[styles.friendChipAvatar, styles.friendChipAvatarFb, { backgroundColor: isPending ? accentColor + "40" : accentColor + "30" }]}><Text style={[styles.friendChipInitials, { color: isPending ? onAccent : accentColor }]}>{getInitials(user.name, user.username)}</Text></View>}
                        <Text style={[styles.friendChipName, { color: isPending ? onAccent : primaryTextColor }]} numberOfLines={1}>
                          {getDisplayName(user.name, user.username)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Pending friend — role selector + Send Invite */}
                {pendingAdd && (
                  <View style={[styles.pendingRolePicker, { borderTopColor: borderColor }]}>
                    <Text style={[styles.pendingRoleLabel, { color: primaryTextColor }]}>
                      Invite <Text style={{ fontWeight: "700" }}>{pendingAdd.name}</Text>
                    </Text>
                    <View style={styles.pendingRoleRow}>
                      <View style={styles.pendingSegmentWrap}>
                        <SegmentedControl
                          options={ROLE_OPTIONS}
                          value={pendingFriendRole}
                          onChange={(v) => setPendingFriendRole(v as "edit" | "view")}
                          accentColor={accentColor}
                          disabled={isAddingFriend}
                        />
                      </View>
                      <Pressable
                        style={[styles.inviteBtn, { backgroundColor: accentColor }, isAddingFriend && styles.dimmed]}
                        onPress={handleAddFriend}
                        disabled={isAddingFriend}
                      >
                        {isAddingFriend
                          ? <ActivityIndicator size="small" color={onAccent} />
                          : <Text style={[styles.inviteBtnText, { color: onAccent }]}>Send Invite</Text>}
                      </Pressable>
                    </View>
                  </View>
                )}

                <View style={[styles.inCardDivider, { backgroundColor: borderColor }]} />
              </>
            )}

            {/* Search input */}
            <View style={[styles.searchInputRow, { backgroundColor: chipBg, borderColor }]}>
              <IconSymbol size={14} name="magnifyingglass" color={mutedTextColor} />
              <TextInput
                style={[styles.searchInput, { color: primaryTextColor }]}
                value={otherQuery}
                onChangeText={(q) => { setOtherQuery(q); setExpandedSearchUserId(null); }}
                placeholder="Search by name or @username"
                placeholderTextColor={mutedTextColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {otherQuery.length > 0 ? (
                <Pressable onPress={() => { setOtherQuery(""); setExpandedSearchUserId(null); }}>
                  <Text style={{ color: mutedTextColor, fontSize: 16 }}>×</Text>
                </Pressable>
              ) : null}
            </View>

            {otherQuery.trim().length === 0 ? null : searchResults === undefined ? (
              <ActivityIndicator size="small" color={accentColor} style={{ marginTop: 4 }} />
            ) : tripSearchRows.length === 0 ? (
              <Text style={[styles.searchEmpty, { color: mutedTextColor }]}>
                {`No users found for "${otherQuery.trim()}".`}
              </Text>
            ) : (
              <View style={[styles.searchResults, { borderColor }]}>
                {(tripSearchRows as SearchUser[]).map((user) => {
                  const alreadyMember = existingMemberUserIds.has(String(user._id));
                  const isExpanded = expandedSearchUserId === String(user._id);
                  const isAddingThisUser = addingSearchUserId === String(user._id);

                  // Status pill if already a member
                  const existingMember = trip.members.find((m: TripMember) => String(m.userId) === String(user._id));
                  const { pillBg, pillBorder, pillText, pillLabel } = (() => {
                    if (!existingMember) return { pillBg: "", pillBorder: "", pillText: "", pillLabel: "" };
                    if (existingMember.status === "pending") {
                      return { pillBg: "#F59E0B18", pillBorder: "#F59E0B55", pillText: "#F59E0B", pillLabel: "Invited" };
                    }
                    if (existingMember.status === "declined") {
                      return { pillBg: dangerColor + "18", pillBorder: dangerColor + "55", pillText: dangerColor, pillLabel: "Declined" };
                    }
                    if (existingMember.role === "edit") {
                      return { pillBg: accentColor + "18", pillBorder: accentColor + "55", pillText: accentColor, pillLabel: "Can Edit" };
                    }
                    return { pillBg: chipBg, pillBorder: borderColor, pillText: mutedTextColor, pillLabel: "View Only" };
                  })();

                  return (
                    <View key={String(user._id)} style={[styles.searchRow, { borderBottomColor: borderColor }]}>
                      {/* Collapsed header row — always visible */}
                      <Pressable
                        style={styles.searchRowMain}
                        onPress={alreadyMember ? undefined : () => toggleSearchRow(String(user._id))}
                        disabled={alreadyMember}
                      >
                        <View style={[styles.searchAvatar, { backgroundColor: accentColor + "22" }]}>
                          {user.avatarUrl
                            ? <Image source={{ uri: user.avatarUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                            : <Text style={[styles.searchInitials, { color: accentColor }]}>{getInitials(user.name, user.username)}</Text>}
                        </View>
                        <View style={styles.searchUserInfo}>
                          {user.name ? <Text style={[styles.searchName, { color: primaryTextColor }]} numberOfLines={1}>{user.name}</Text> : null}
                          <Text style={[styles.searchUsername, { color: mutedTextColor }]} numberOfLines={1}>@{user.username}</Text>
                        </View>
                        {alreadyMember ? (
                          <View style={[styles.rolePill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
                            <Text style={[styles.rolePillText, { color: pillText }]}>{pillLabel}</Text>
                          </View>
                        ) : (
                          <IconSymbol
                            name={isExpanded ? "chevron.up" : "person.badge.plus"}
                            size={14}
                            color={isExpanded ? mutedTextColor : accentColor}
                          />
                        )}
                      </Pressable>

                      {/* Expanded invite controls */}
                      {isExpanded && !alreadyMember && (
                        <View style={[styles.searchExpandedRow, { borderTopColor: borderColor }]}>
                          <View style={styles.searchSegmentWrap}>
                            <SegmentedControl
                              options={ROLE_OPTIONS}
                              value={expandedSearchRole}
                              onChange={(v) => setExpandedSearchRole(v as "edit" | "view")}
                              accentColor={accentColor}
                              disabled={isAddingThisUser}
                            />
                          </View>
                          <Pressable
                            style={[styles.inviteBtn, { backgroundColor: accentColor }, isAddingThisUser && styles.dimmed]}
                            onPress={() => handleAddBySearch(user._id)}
                            disabled={isAddingThisUser}
                          >
                            {isAddingThisUser
                              ? <ActivityIndicator size="small" color={onAccent} />
                              : <Text style={[styles.inviteBtnText, { color: onAccent }]}>Invite</Text>}
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Invite to Sign Up */}
            <Pressable
              style={[styles.inviteToSignUpBtn, { borderColor: accentColor + "55" }]}
              onPress={() => router.push("/invite-friend")}
            >
              <IconSymbol size={14} name="person.fill.badge.plus" color={accentColor} />
              <Text style={[styles.inviteToSignUpText, { color: accentColor }]}>Invite a Friend to Sign Up</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabContent: { padding: 16, gap: 16 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: -4 },

  // Member cards (On This Trip)
  memberCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  memberCardMain: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  memberAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", flexShrink: 0,
  },
  memberInitials: { fontSize: 15, fontWeight: "700" },
  memberInfo: { flex: 1, gap: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: "700" },
  memberUsername: { fontSize: 12 },

  // Role pill badge
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  rolePillText: { fontSize: 11, fontWeight: "700" },

  // Expanded member row
  memberExpanded: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  expandedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  expandedSegmentWrap: { minWidth: 148, maxWidth: 180 },
  removeBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  revokeBtn: { alignSelf: "flex-start", borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  removeBtnText: { fontSize: 13, fontWeight: "600" },

  // Friends chips
  friendChipRow: { flexDirection: "row", gap: 8, paddingBottom: 2 },
  friendChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 999, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  friendChipAvatar: { width: 22, height: 22, borderRadius: 11 },
  friendChipAvatarFb: { alignItems: "center", justifyContent: "center" },
  friendChipInitials: { fontSize: 8, fontWeight: "700" },
  friendChipName: { fontSize: 13, fontWeight: "600", maxWidth: 80 },

  // Pending role picker (friends)
  inCardDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  pendingRolePicker: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 },
  pendingRoleLabel: { fontSize: 14 },
  pendingRoleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pendingSegmentWrap: { minWidth: 148, maxWidth: 180 },

  // Shared invite button
  inviteBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  inviteBtnText: { fontSize: 13, fontWeight: "700" },
  dimmed: { opacity: 0.5 },

  // Search input
  searchInputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10, paddingVertical: 8, gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchEmpty: { fontSize: 13, fontStyle: "italic", paddingVertical: 4 },

  // Search results
  searchResults: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  searchRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  searchRowMain: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  searchAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  searchInitials: { fontSize: 12, fontWeight: "700" },
  searchUserInfo: { flex: 1, minWidth: 0 },
  searchName: { fontSize: 14, fontWeight: "600" },
  searchUsername: { fontSize: 12 },
  searchExpandedRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  searchSegmentWrap: { minWidth: 148, maxWidth: 180 },

  // Invite to sign up (bottom)
  inviteToSignUpBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingVertical: 8,
    borderStyle: "dashed",
  },
  inviteToSignUpText: { fontSize: 13, fontWeight: "600" },
});

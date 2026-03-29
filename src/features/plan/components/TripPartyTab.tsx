import { Image } from "expo-image";
import { useState } from "react";
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

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useTripData } from "@/features/plan/hooks/useTripData";
import { useColorScheme } from "@/hooks/use-color-scheme";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, username?: string) {
  const source = name?.trim() || username || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

// ─── component ────────────────────────────────────────────────────────────────

interface TripPartyTabProps {
  trip: any;
  tripId: Id<"trips">;
  onViewUser: (userId: Id<"users">) => void;
}

export function TripPartyTab({ trip, tripId, onViewUser }: TripPartyTabProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const chipBg = Colors[theme].surface;
  const dangerColor = Colors[theme].danger;

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [otherQuery, setOtherQuery] = useState("");
  const [pendingAdd, setPendingAdd] = useState<{ _id: Id<"users">; name: string } | null>(null);
  // Track which role button is loading to show indicator on the correct one
  const [addingFriendRole, setAddingFriendRole] = useState<"edit" | "view" | null>(null);
  const [addingSearchRole, setAddingSearchRole] = useState<{ userId: string; role: "edit" | "view" } | null>(null);

  const myFollowing = useQuery(api.social.listMyFollowing, {});
  const searchResults = useQuery(
    api.profiles.searchUsers,
    otherQuery.trim().length >= 2 ? { q: otherQuery.trim() } : "skip"
  );

  const { addTripMember, removeTripMember, updateTripMemberRole } = useTripData();

  const existingMemberUserIds = new Set((trip?.members ?? []).map((m: any) => String(m.userId)));
  const friendsNotYetMembers = (myFollowing ?? []).filter((f: any) => !existingMemberUserIds.has(String(f._id)));

  const handleAddFriendWithRole = async (userId: Id<"users">, role: "edit" | "view") => {
    setAddingFriendRole(role);
    try {
      await addTripMember({ tripId, userId, role });
      setPendingAdd(null);
    } catch {
      Alert.alert("Error", "Could not add member.");
    } finally {
      setAddingFriendRole(null);
    }
  };

  const handleAddBySearchWithRole = async (userId: Id<"users">, role: "edit" | "view") => {
    setAddingSearchRole({ userId: String(userId), role });
    try {
      await addTripMember({ tripId, userId, role });
      setOtherQuery("");
    } catch {
      Alert.alert("Error", "Could not add member.");
    } finally {
      setAddingSearchRole(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 80 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionLabel, { color: mutedTextColor }]}>ON THIS TRIP</Text>

      {/* Owner row */}
      <Pressable
        style={[styles.memberCard, { backgroundColor: surfaceColor, borderColor }]}
        onPress={() => trip.owner?._id && !trip.isOwner ? onViewUser(trip.owner._id) : undefined}
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
          <View style={[styles.rolePill, { backgroundColor: accentColor + "18", borderColor: accentColor + "40" }]}>
            <Text style={[styles.rolePillText, { color: accentColor }]}>Organizer</Text>
          </View>
        </View>
      </Pressable>

      {/* Member rows — tapping anywhere on the card expands it */}
      {trip.members.map((m: any) => {
        const isExpanded = expandedMemberId === String(m._id);
        const roleLabel = m.role === "edit" ? "Can Edit" : "View Only";
        return (
          <Pressable
            key={String(m._id)}
            style={[styles.memberCard, { backgroundColor: surfaceColor, borderColor }]}
            onPress={trip.isOwner ? () => setExpandedMemberId(isExpanded ? null : String(m._id)) : undefined}
          >
            <View style={styles.memberCardMain}>
              {/* Avatar press opens profile without collapsing the card */}
              <Pressable onPress={() => m.user?._id ? onViewUser(m.user._id) : undefined} hitSlop={4}>
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
              <View style={[styles.rolePill, { backgroundColor: m.role === "edit" ? accentColor + "22" : chipBg, borderColor: m.role === "edit" ? accentColor + "60" : borderColor }]}>
                <Text style={[styles.rolePillText, { color: m.role === "edit" ? accentColor : mutedTextColor }]}>{roleLabel}</Text>
              </View>
              {trip.isOwner && isExpanded ? <Text style={[styles.memberChevron, { color: mutedTextColor }]}>▲</Text> : null}
            </View>

            {isExpanded && trip.isOwner ? (
              <View style={styles.memberExpanded}>
                <View style={styles.roleButtonRow}>
                  <Pressable
                    style={[styles.roleButton, m.role === "edit" ? { backgroundColor: accentColor, borderColor: accentColor } : { backgroundColor: chipBg, borderColor }]}
                    onPress={() => { if (m.role !== "edit") updateTripMemberRole({ tripId, memberId: m._id, role: "edit" }); }}
                  >
                    <Text style={[styles.roleButtonText, { color: m.role === "edit" ? "#fff" : mutedTextColor }]}>Can Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.roleButton, m.role === "view" ? { backgroundColor: accentColor, borderColor: accentColor } : { backgroundColor: chipBg, borderColor }]}
                    onPress={() => { if (m.role !== "view") updateTripMemberRole({ tripId, memberId: m._id, role: "view" }); }}
                  >
                    <Text style={[styles.roleButtonText, { color: m.role === "view" ? "#fff" : mutedTextColor }]}>View Only</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.roleButton, { borderColor: dangerColor + "55", marginLeft: "auto" }]}
                    onPress={() => {
                      const name = m.user?.name || m.user?.username || "member";
                      Alert.alert(`Remove ${name}?`, "", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Remove", style: "destructive", onPress: () => { removeTripMember({ tripId, memberId: m._id }); setExpandedMemberId(null); } },
                      ]);
                    }}
                  >
                    <Text style={[styles.roleButtonText, { color: dangerColor }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {/* Add section — only for trip owner */}
      {trip.isOwner ? (
        <>
          <Text style={[styles.sectionLabel, { color: mutedTextColor, marginTop: 20 }]}>ADD TO PARTY</Text>
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            {/* Friends chips */}
            {friendsNotYetMembers.length > 0 ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendChipRow}>
                  {friendsNotYetMembers.map((user: any) => {
                    const isPending = pendingAdd?._id === user._id;
                    return (
                      <Pressable
                        key={String(user._id)}
                        style={[styles.friendChip, { backgroundColor: isPending ? accentColor : chipBg, borderColor: isPending ? accentColor : borderColor }]}
                        onPress={() => setPendingAdd(isPending ? null : { _id: user._id, name: user.name?.split(" ")[0] ?? user.username })}
                      >
                        {user.avatarUrl
                          ? <Image source={{ uri: user.avatarUrl }} style={styles.friendChipAvatar} contentFit="cover" />
                          : <View style={[styles.friendChipAvatar, styles.friendChipAvatarFb, { backgroundColor: isPending ? "rgba(255,255,255,0.25)" : accentColor + "30" }]}><Text style={[styles.friendChipInitials, { color: isPending ? "#fff" : accentColor }]}>{getInitials(user.name, user.username)}</Text></View>}
                        <Text style={[styles.friendChipName, { color: isPending ? "#fff" : primaryTextColor }]} numberOfLines={1}>
                          {user.name?.split(" ")[0] ?? user.username}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Inline role picker — loading shows on the correct button only */}
                {pendingAdd ? (
                  <View style={[styles.pendingRolePicker, { borderTopColor: borderColor }]}>
                    <Text style={[styles.pendingRoleLabel, { color: primaryTextColor }]}>
                      Add <Text style={{ fontWeight: "700" }}>{pendingAdd.name}</Text> as:
                    </Text>
                    <View style={styles.roleButtonRow}>
                      <Pressable
                        style={[styles.roleButton, { backgroundColor: accentColor, borderColor: accentColor }, addingFriendRole !== null && styles.disabled]}
                        onPress={() => handleAddFriendWithRole(pendingAdd._id, "edit")}
                        disabled={addingFriendRole !== null}
                      >
                        {addingFriendRole === "edit"
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={[styles.roleButtonText, { color: "#fff" }]}>Can Edit</Text>}
                      </Pressable>
                      <Pressable
                        style={[styles.roleButton, { backgroundColor: chipBg, borderColor }, addingFriendRole !== null && styles.disabled]}
                        onPress={() => handleAddFriendWithRole(pendingAdd._id, "view")}
                        disabled={addingFriendRole !== null}
                      >
                        {addingFriendRole === "view"
                          ? <ActivityIndicator size="small" color={mutedTextColor} />
                          : <Text style={[styles.roleButtonText, { color: mutedTextColor }]}>View Only</Text>}
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                <View style={[styles.inCardDivider, { backgroundColor: borderColor }]} />
              </>
            ) : null}

            {/* Search input */}
            <View style={[styles.searchInputRow, { backgroundColor: chipBg, borderColor }]}>
              <IconSymbol size={14} name="magnifyingglass" color={mutedTextColor} />
              <TextInput
                style={[styles.searchInput, { color: primaryTextColor }]}
                value={otherQuery}
                onChangeText={setOtherQuery}
                placeholder="Search by name or @username"
                placeholderTextColor={mutedTextColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {otherQuery.length > 0 ? <Pressable onPress={() => setOtherQuery("")}><Text style={{ color: mutedTextColor, fontSize: 16 }}>×</Text></Pressable> : null}
            </View>

            {otherQuery.trim().length >= 2 ? (
              searchResults === undefined ? (
                <ActivityIndicator size="small" color={accentColor} style={{ marginTop: 4 }} />
              ) : searchResults.length === 0 ? (
                <Text style={[styles.searchEmpty, { color: mutedTextColor }]}>No users found for "{otherQuery}"</Text>
              ) : (
                <View style={[styles.searchResults, { borderColor }]}>
                  {(searchResults as any[]).map((user) => {
                    const alreadyMember = existingMemberUserIds.has(String(user._id));
                    const isAddingThisUser = addingSearchRole?.userId === String(user._id);
                    return (
                      <View key={String(user._id)} style={[styles.searchRow, { borderBottomColor: borderColor }]}>
                        <View style={[styles.searchAvatar, { backgroundColor: accentColor + "22" }]}>
                          {user.avatarUrl
                            ? <Image source={{ uri: user.avatarUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                            : <Text style={[styles.searchInitials, { color: accentColor }]}>{getInitials(user.name, user.username)}</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          {user.name ? <Text style={[styles.searchName, { color: primaryTextColor }]}>{user.name}</Text> : null}
                          <Text style={[styles.searchUsername, { color: mutedTextColor }]}>@{user.username}</Text>
                        </View>
                        {alreadyMember ? (
                          <Text style={[styles.searchAlready, { color: mutedTextColor }]}>Added</Text>
                        ) : (
                          <View style={styles.searchRoleBtns}>
                            <Pressable
                              style={[styles.searchRoleBtn, { backgroundColor: accentColor }, isAddingThisUser && styles.disabled]}
                              onPress={() => handleAddBySearchWithRole(user._id, "edit")}
                              disabled={isAddingThisUser}
                            >
                              {isAddingThisUser && addingSearchRole?.role === "edit"
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={styles.searchRoleBtnText}>Edit</Text>}
                            </Pressable>
                            <Pressable
                              style={[styles.searchRoleBtn, { backgroundColor: chipBg, borderWidth: StyleSheet.hairlineWidth, borderColor }, isAddingThisUser && styles.disabled]}
                              onPress={() => handleAddBySearchWithRole(user._id, "view")}
                              disabled={isAddingThisUser}
                            >
                              {isAddingThisUser && addingSearchRole?.role === "view"
                                ? <ActivityIndicator size="small" color={mutedTextColor} />
                                : <Text style={[styles.searchRoleBtnText, { color: mutedTextColor }]}>View</Text>}
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )
            ) : null}

            {/* Invite placeholder */}
            <Pressable
              style={[styles.inviteBtn, { borderColor }]}
              onPress={() => Alert.alert("Coming soon", "Invite links will let you add people who haven't signed up yet.")}
            >
              <IconSymbol size={14} name="envelope.fill" color={mutedTextColor} />
              <Text style={[styles.inviteBtnText, { color: mutedTextColor }]}>Invite to Sign Up</Text>
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
  memberCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  memberCardMain: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  memberInitials: { fontSize: 15, fontWeight: "700" },
  memberInfo: { flex: 1, gap: 1 },
  memberName: { fontSize: 14, fontWeight: "700" },
  memberUsername: { fontSize: 12 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  rolePillText: { fontSize: 11, fontWeight: "700" },
  memberChevron: { fontSize: 10, marginLeft: 4 },
  memberExpanded: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  inCardDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  roleButtonRow: { flexDirection: "row", gap: 8 },
  roleButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 70,
    alignItems: "center",
  },
  roleButtonText: { fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  friendChipRow: { flexDirection: "row", gap: 8, paddingBottom: 2 },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  friendChipAvatar: { width: 22, height: 22, borderRadius: 11 },
  friendChipAvatarFb: { alignItems: "center", justifyContent: "center" },
  friendChipInitials: { fontSize: 8, fontWeight: "700" },
  friendChipName: { fontSize: 13, fontWeight: "600", maxWidth: 80 },
  pendingRolePicker: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 },
  pendingRoleLabel: { fontSize: 14 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchEmpty: { fontSize: 13, fontStyle: "italic", paddingVertical: 4 },
  searchResults: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  searchAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  searchInitials: { fontSize: 12, fontWeight: "700" },
  searchName: { fontSize: 14, fontWeight: "600" },
  searchUsername: { fontSize: 12 },
  searchAlready: { fontSize: 12, fontStyle: "italic" },
  searchRoleBtns: { flexDirection: "row", gap: 6 },
  searchRoleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 40, alignItems: "center" },
  searchRoleBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderStyle: "dashed",
  },
  inviteBtnText: { fontSize: 13, fontWeight: "600" },
});

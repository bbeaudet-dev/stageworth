import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "convex/react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { SearchUser, TripMember } from "@/features/plan/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInitials } from "@/utils/user";

const ROLE_OPTIONS = [
  { value: "edit", label: "Editor" },
  { value: "view", label: "Viewer" },
];

interface PartyUserSearchProps {
  existingMemberUserIds: Set<string>;
  tripMembers: TripMember[];
  addMember: (userId: Id<"users">, role: "edit" | "view") => Promise<void>;
}

export function PartyUserSearch({ existingMemberUserIds, tripMembers, addMember }: PartyUserSearchProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const chipBg = Colors[theme].surface;
  const dangerColor = Colors[theme].danger;

  const [otherQuery, setOtherQuery] = useState("");
  const [expandedSearchUserId, setExpandedSearchUserId] = useState<string | null>(null);
  const [expandedSearchRole, setExpandedSearchRole] = useState<"edit" | "view">("edit");
  const [addingSearchUserId, setAddingSearchUserId] = useState<string | null>(null);

  const myUserId = useQuery(api.auth.getConvexUserIdQuery);
  const searchResults = useQuery(api.social.profiles.searchUsers, { q: otherQuery.trim() });

  const tripSearchRows = (searchResults ?? []).filter(
    (u: { _id: Id<"users"> }) =>
      u._id !== myUserId && !existingMemberUserIds.has(String(u._id))
  );

  const toggleSearchRow = (userId: string) => {
    if (expandedSearchUserId === userId) {
      setExpandedSearchUserId(null);
    } else {
      setExpandedSearchUserId(userId);
      setExpandedSearchRole("edit");
    }
  };

  const handleAddBySearch = async (userId: Id<"users">) => {
    setAddingSearchUserId(String(userId));
    try {
      await addMember(userId, expandedSearchRole);
      setOtherQuery("");
      setExpandedSearchUserId(null);
      setExpandedSearchRole("edit");
    } catch {
      Alert.alert("Error", "Could not add member.");
    } finally {
      setAddingSearchUserId(null);
    }
  };

  return (
    <>
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

            const existingMember = tripMembers.find((m) => String(m.userId) === String(user._id));
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
    </>
  );
}

const styles = StyleSheet.create({
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  rolePillText: { fontSize: 11, fontWeight: "700" },
  searchInputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10, paddingVertical: 8, gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchEmpty: { fontSize: 13, fontStyle: "italic", paddingVertical: 4 },
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
  inviteBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  inviteBtnText: { fontSize: 13, fontWeight: "700" },
  dimmed: { opacity: 0.5 },
  inviteToSignUpBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingVertical: 8,
    borderStyle: "dashed",
  },
  inviteToSignUpText: { fontSize: 13, fontWeight: "600" },
});

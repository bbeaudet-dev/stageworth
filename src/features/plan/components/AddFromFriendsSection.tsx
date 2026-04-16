import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SegmentedControl } from "@/components/SegmentedControl";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import type { FollowingUser } from "@/features/plan/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getDisplayName, getInitials } from "@/utils/user";

const ROLE_OPTIONS = [
  { value: "edit", label: "Editor" },
  { value: "view", label: "Viewer" },
];

interface AddFromFriendsSectionProps {
  friends: FollowingUser[];
  addMember: (userId: Id<"users">, role: "edit" | "view") => Promise<void>;
  /** Bottom divider rendered after the section, inside the parent card */
  showDivider?: boolean;
}

export function AddFromFriendsSection({ friends, addMember, showDivider = true }: AddFromFriendsSectionProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const chipBg = Colors[theme].surface;

  const [pendingAdd, setPendingAdd] = useState<{ _id: Id<"users">; name: string } | null>(null);
  const [pendingFriendRole, setPendingFriendRole] = useState<"edit" | "view">("edit");
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  const handleAddFriend = async () => {
    if (!pendingAdd) return;
    setIsAddingFriend(true);
    try {
      await addMember(pendingAdd._id, pendingFriendRole);
      setPendingAdd(null);
      setPendingFriendRole("edit");
    } catch {
      Alert.alert("Error", "Could not add member.");
    } finally {
      setIsAddingFriend(false);
    }
  };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendChipRow}>
        {friends.map((user) => {
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

      {showDivider && <View style={[styles.inCardDivider, { backgroundColor: borderColor }]} />}
    </>
  );
}

const styles = StyleSheet.create({
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
  inCardDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  pendingRolePicker: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 },
  pendingRoleLabel: { fontSize: 14 },
  pendingRoleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pendingSegmentWrap: { minWidth: 148, maxWidth: 180 },
  inviteBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  inviteBtnText: { fontSize: 13, fontWeight: "700" },
  dimmed: { opacity: 0.5 },
});

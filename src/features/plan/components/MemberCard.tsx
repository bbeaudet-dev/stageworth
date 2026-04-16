import { Image } from "expo-image";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { SegmentedControl } from "@/components/SegmentedControl";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import type { TripMember } from "@/features/plan/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInitials } from "@/utils/user";

const ROLE_OPTIONS = [
  { value: "edit", label: "Editor" },
  { value: "view", label: "Viewer" },
];

interface MemberCardProps {
  member: TripMember;
  isExpanded: boolean;
  canExpand: boolean;
  onToggleExpand: () => void;
  onViewUser: (username: string) => void;
  onRemoveMember: () => void;
  onChangeRole: (role: "edit" | "view") => void;
}

export function MemberCard({
  member: m,
  isExpanded,
  canExpand,
  onToggleExpand,
  onViewUser,
  onRemoveMember,
  onChangeRole,
}: MemberCardProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const dangerColor = Colors[theme].danger;

  const { pillBg, pillBorder, pillText, pillLabel } = (() => {
    if (m.status === "pending") {
      return { pillBg: "#ECE8F6", pillBorder: "#C4B8E8", pillText: "#6B51A8", pillLabel: "Invited" };
    }
    if (m.status === "declined") {
      return { pillBg: "#EBEBED", pillBorder: "#D1D5DB", pillText: "#7B7B86", pillLabel: "Declined" };
    }
    if (m.role === "edit") {
      return { pillBg: "#7B8EFE", pillBorder: "#536DFE", pillText: "#FFFFFF", pillLabel: "Editor" };
    }
    return { pillBg: "#B9C2FD", pillBorder: "#8B9AFE", pillText: "#1E3399", pillLabel: "Viewer" };
  })();

  return (
    <Pressable
      style={[styles.memberCard, { backgroundColor: surfaceColor, borderColor }]}
      onPress={canExpand ? onToggleExpand : undefined}
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

      {isExpanded && (
        <View style={[styles.memberExpanded, { borderTopColor: borderColor }]}>
          {m.status === "pending" ? (
            <Pressable
              style={[styles.revokeBtn, { borderColor: dangerColor + "44" }]}
              onPress={() => {
                const name = m.user?.name || m.user?.username || "this invite";
                Alert.alert(
                  "Revoke Invite",
                  `Revoke the invite sent to ${name}?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Revoke", style: "destructive", onPress: onRemoveMember },
                  ]
                );
              }}
            >
              <Text style={[styles.removeBtnText, { color: dangerColor }]}>Revoke Invite</Text>
            </Pressable>
          ) : (
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
                        { text: "Confirm", onPress: () => onChangeRole(newRole) },
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
                    { text: "Remove", style: "destructive", onPress: onRemoveMember },
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
}

const styles = StyleSheet.create({
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
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  rolePillText: { fontSize: 11, fontWeight: "700" },
  memberExpanded: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  expandedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  expandedSegmentWrap: { minWidth: 148, maxWidth: 180 },
  removeBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  revokeBtn: { alignSelf: "flex-start", borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  removeBtnText: { fontSize: 13, fontWeight: "600" },
});

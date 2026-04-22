import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AddFromFriendsSection } from "@/features/plan/components/AddFromFriendsSection";
import { MemberCard } from "@/features/plan/components/MemberCard";
import { PartyUserSearch } from "@/features/plan/components/PartyUserSearch";
import { useTripData } from "@/features/plan/hooks/useTripData";
import type { TripDetail, TripMember, FollowingUser } from "@/features/plan/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInitials } from "@/utils/user";

interface TripPartyTabProps {
  trip: TripDetail;
  tripId: Id<"trips">;
  onViewUser: (username: string) => void;
}

export function TripPartyTab({ trip, tripId, onViewUser }: TripPartyTabProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const dangerColor = Colors[theme].danger;

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const myFollowing = useQuery(api.social.social.listMyFollowing, {});
  const { addTripMember, removeTripMember, updateTripMemberRole, leaveTrip } = useTripData();

  const canLeave = !trip.isOwner && trip.myMembershipStatus === "accepted";

  const handleLeaveTrip = () => {
    Alert.alert(
      `Leave "${trip.name}"?`,
      "You'll lose access to this trip's shows and schedule. The organizer can re-invite you later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Trip",
          style: "destructive",
          onPress: async () => {
            setIsLeaving(true);
            try {
              await leaveTrip({ tripId });
              router.back();
            } catch (err) {
              const message = err instanceof Error ? err.message : "Could not leave trip.";
              Alert.alert("Couldn't leave trip", message);
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ],
    );
  };

  const existingMemberUserIds = useMemo(
    () => new Set((trip?.members ?? []).map((m: TripMember) => String(m.userId))),
    [trip?.members]
  );
  const friendsNotYetMembers = (myFollowing ?? []).filter(
    (f: FollowingUser) => !existingMemberUserIds.has(String(f._id))
  );

  const addMember = async (userId: Id<"users">, role: "edit" | "view") => {
    await addTripMember({ tripId, userId, role });
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
          <View style={[styles.rolePill, { backgroundColor: "#536DFE", borderColor: "#3355E0" }]}>
            <Text style={[styles.rolePillText, { color: "#FFFFFF" }]}>Organizer</Text>
          </View>
        </View>
      </Pressable>

      {/* Member rows */}
      {trip.members.map((m: TripMember) => {
        const memberId = String(m._id);
        const canExpand = trip.isOwner && (m.status === "accepted" || m.status === "pending");
        return (
          <MemberCard
            key={memberId}
            member={m}
            isExpanded={expandedMemberId === memberId}
            canExpand={canExpand}
            onToggleExpand={() => setExpandedMemberId((prev) => (prev === memberId ? null : memberId))}
            onViewUser={onViewUser}
            onRemoveMember={() => { removeTripMember({ tripId, memberId: m._id }); setExpandedMemberId(null); }}
            onChangeRole={(role) => updateTripMemberRole({ tripId, memberId: m._id, role })}
          />
        );
      })}

      {/* ── ADD TO PARTY (owner only) ─────────────────────────────────────── */}
      {trip.isOwner ? (
        <>
          <Text style={[styles.sectionLabel, { color: mutedTextColor, marginTop: 20 }]}>ADD TO PARTY</Text>
          <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            {friendsNotYetMembers.length > 0 && (
              <AddFromFriendsSection friends={friendsNotYetMembers} addMember={addMember} />
            )}
            <PartyUserSearch
              existingMemberUserIds={existingMemberUserIds}
              tripMembers={trip.members}
              addMember={addMember}
            />
          </View>
        </>
      ) : null}

      {/* ── LEAVE TRIP (non-owner accepted members) ───────────────────────── */}
      {canLeave ? (
        <Pressable
          style={[
            styles.leaveTripBtn,
            {
              borderColor: dangerColor + "44",
              opacity: isLeaving ? 0.5 : 1,
              marginTop: 20,
            },
          ]}
          disabled={isLeaving}
          onPress={handleLeaveTrip}
        >
          <Text style={[styles.leaveTripBtnText, { color: dangerColor }]}>
            {isLeaving ? "Leaving…" : "Leave Trip"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { padding: 16, gap: 16 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: -4 },
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
  leaveTripBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  leaveTripBtnText: { fontSize: 14, fontWeight: "700" },
});

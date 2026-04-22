import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useBlockUser } from "@/features/safety/components/useBlockUser";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function BlockedUsersScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  const blocks = useQuery(api.social.safety.listMyBlocks) ?? null;
  const { confirmUnblock, pending } = useBlockUser();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Blocked users",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.intro, { color: c.mutedText }]}>
          Blocked users cannot see your posts or profile, and you will not see
          theirs. You both stop following each other automatically.
        </Text>

        {blocks === null && (
          <ActivityIndicator style={styles.loader} color={c.accent} />
        )}

        {blocks && blocks.length === 0 && (
          <Text style={[styles.empty, { color: c.mutedText }]}>
            You have not blocked anyone.
          </Text>
        )}

        {blocks?.map((user) => (
          <View
            key={user._id}
            style={[
              styles.row,
              {
                backgroundColor: c.surfaceElevated,
                borderColor: c.border,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              {user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarFallback,
                    { backgroundColor: c.surface },
                  ]}
                >
                  <Text style={[styles.avatarLetter, { color: c.mutedText }]}>
                    {(user.username ?? "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {user.name?.trim() || user.username}
                </Text>
                <Text
                  style={[styles.handle, { color: c.mutedText }]}
                  numberOfLines={1}
                >
                  @{user.username}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() =>
                confirmUnblock(user._id as Id<"users">, user.username)
              }
              disabled={pending}
              style={({ pressed }) => [
                styles.unblockBtn,
                {
                  borderColor: c.border,
                  opacity: pressed || pending ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.unblockLabel, { color: c.text }]}>
                Unblock
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  loader: { marginTop: 40 },
  empty: { marginTop: 40, textAlign: "center", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 10,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: { flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 15, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "600" },
  handle: { fontSize: 12, marginTop: 2 },
  unblockBtn: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  unblockLabel: { fontSize: 13, fontWeight: "600" },
});

import { Redirect, Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ProfileTabIcon } from "@/components/ui/ProfileTabIcon";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePendingInvite } from "@/hooks/use-pending-invite";
import { useSession } from "@/lib/auth-client";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { data: session, isPending } = useSession();
  const { claimPendingInvite } = usePendingInvite();
  const didClaimRef = useRef(false);

  useEffect(() => {
    if (session && !isPending && !didClaimRef.current) {
      didClaimRef.current = true;
      claimPendingInvite();
    }
  }, [session, isPending]);

  // Same as sign-in: don't blank the whole tab shell while session exists but the
  // client is still revalidating (common right after OAuth on Android).
  if (!session && isPending) {
    const c = Colors[colorScheme ?? "light"];
    return (
      <View style={[styles.authGate, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tabIconSelected,
        tabBarInactiveTintColor:
          Colors[colorScheme ?? "light"].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: "absolute",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(10, 10, 10, 0.9)"
              : "rgba(255, 255, 255, 0.82)",
          borderTopColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.12)"
              : "rgba(0, 0, 0, 0.07)",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="browse" options={{ href: null }} />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="map.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-shows"
        options={{
          title: "My Shows",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="theatermasks.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <ProfileTabIcon color={color} size={28} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  authGate: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

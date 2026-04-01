import { Redirect, Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ProfileTabIcon } from "@/components/ui/ProfileTabIcon";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/lib/auth-client";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { data: session, isPending } = useSession();

  if (isPending) return null;
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
      <Tabs.Screen name="actions" options={{ href: null }} />
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
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => {
            const accent = Colors[colorScheme ?? "light"].accent;
            const bg = colorScheme === "dark"
              ? focused ? "#2a3a42" : "#1e2c33"
              : accent;
            return (
              <View style={[styles.plusButton, { backgroundColor: bg }]}>
                <Text style={styles.plusText}>+</Text>
              </View>
            );
          },
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
  plusButton: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  plusText: {
    color: "#ffffff",
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "400",
    marginTop: -1,
  },
});

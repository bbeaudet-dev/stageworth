import { Redirect, Tabs, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ActionsMenu } from "@/components/actions-menu";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/lib/auth-client";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { data: session, isPending } = useSession();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const router = useRouter();

  if (isPending) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tabIconSelected,
          tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
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
        screenListeners={{
          tabPress: () => {
            setShowActionsMenu(false);
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ href: null }}
        />
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
          name="actions"
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              setShowActionsMenu(true);
            },
          }}
          options={{
            title: "",
            tabBarLabel: () => null,
            tabBarIcon: ({ focused }) => (
              <View
                style={[
                  styles.actionTabButton,
                  focused && styles.actionTabButton,
                ]}
              >
                <Text
                  style={[
                    styles.actionTabButtonText,
                    {
                      color:
                        colorScheme === "dark"
                          ? "#ffffff"
                          : "#1f1f1f",
                    },
                  ]}
                >
                  +
                </Text>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: "Browse",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="theatermasks.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "My Shows",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="person.fill" color={color} />
            ),
          }}
        />
      </Tabs>
      <ActionsMenu
        visible={showActionsMenu}
        onClose={() => setShowActionsMenu(false)}
        onAddVisit={() => {
          setShowActionsMenu(false);
          router.push("/add-visit");
        }}
        onCreateTrip={() => {
          setShowActionsMenu(false);
          router.push({
            pathname: "/(tabs)/plan",
            params: { createTrip: "1" },
          });
        }}
        onCreateList={() => {
          setShowActionsMenu(false);
          router.push({
            pathname: "/(tabs)/plan",
            params: { createList: "1" },
          });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionTabButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  actionTabButtonText: {
    fontSize: 24,
    lineHeight: 24,
    marginTop: -1,
    fontWeight: "600",
  },
});

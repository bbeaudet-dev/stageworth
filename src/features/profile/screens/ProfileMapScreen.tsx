import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { MyShowsMapView } from "@/features/my-shows/components/MyShowsMapView";
import { useColorScheme } from "@/hooks/use-color-scheme";

type MapScope = "mine" | "following" | "all";

export default function ProfileMapScreen() {
  const [mapScope, setMapScope] = useState<MapScope>("mine");
  const tabBarHeight = useBottomTabBarHeight();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Theatre Map",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <View style={styles.content}>
        <MyShowsMapView
          tabBarHeight={tabBarHeight}
          mapScope={mapScope}
          onChangeMapScope={setMapScope}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});

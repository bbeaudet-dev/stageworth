import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { ToastProvider } from "@/components/Toast";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authClient } from "@/lib/auth-client";
import { convex } from "@/lib/convex";
import { ProfileSettingsDrawerProvider } from "@/features/profile/ProfileSettingsDrawerProvider";

GoogleSignin.configure({
  iosClientId: __DEV__
    ? "907289279863-uoqm36rn3c5c0se27h3mmg6cj4flc6dt.apps.googleusercontent.com"
    : "907289279863-tl52ra1s7itgbhqogjo93ub1qdlohgfh.apps.googleusercontent.com",
  webClientId:
    "907289279863-vcofhu6sieo2a69t6u01s28167c9q2ve.apps.googleusercontent.com",
});

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <ToastProvider>
            <ProfileSettingsDrawerProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="sign-in" options={{ headerShown: false }} />
                <Stack.Screen
                  name="add-visit"
                  options={{ presentation: "modal", headerShown: false }}
                />
                <Stack.Screen
                  name="edit-visit/[visitId]"
                  options={{ presentation: "modal", headerShown: false }}
                />
                <Stack.Screen
                  name="edit-profile"
                  options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }}
                />
                <Stack.Screen
                  name="preferences"
                  options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }}
                />
                <Stack.Screen
                  name="notification-preferences"
                  options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }}
                />
                <Stack.Screen
                  name="notifications"
                  options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }}
                />
                <Stack.Screen
                  name="account-settings"
                  options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }}
                />
                <Stack.Screen
                  name="user-search"
                  options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }}
                />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal", title: "Modal" }}
                />
              </Stack>
              <StatusBar style="auto" />
            </ProfileSettingsDrawerProvider>
          </ToastProvider>
        </ThemeProvider>
      </ConvexBetterAuthProvider>
    </GestureHandlerRootView>
  );
}

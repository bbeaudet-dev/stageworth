import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { authClient } from "@/lib/auth-client";
import { convex } from "@/lib/convex";

GoogleSignin.configure({
  iosClientId:
    "436999476070-l97q7s44m1p9irm4ve8objjm0dt11pgn.apps.googleusercontent.com",
  androidClientId:
    "938750523886-jo9sbce2e79kd2im27t7knst7qh95rfj.apps.googleusercontent.com",
  webClientId:
    "436999476070-7gcd35jrbfkreu1smj4oo3k16e7n1nkb.apps.googleusercontent.com",
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
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-visit"
              options={{ presentation: "modal", headerShown: false }}
            />
            <Stack.Screen
              name="account-settings"
              options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }}
            />
            <Stack.Screen
              name="notifications"
              options={{ headerShown: true, headerBackButtonDisplayMode: "minimal" }}
            />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ConvexBetterAuthProvider>
    </GestureHandlerRootView>
  );
}

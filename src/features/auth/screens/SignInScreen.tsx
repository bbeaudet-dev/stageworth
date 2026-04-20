import { FontAwesome } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { memo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, BRAND_BLUE, BRAND_PURPLE } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSocialAuth } from "@/hooks/use-social-auth";
import { useSession } from "@/lib/auth-client";

const Header = memo(function Header({ subtitleColor }: { subtitleColor: string }) {
  return (
    <View style={styles.header}>
      <Image
        source={require("../../../../assets/icon-kitchen-v1/web/icon-512.png")}
        style={styles.appIcon}
        contentFit="contain"
        accessibilityLabel="Stageworth app icon"
      />
      {/* Two-tone wordmark: blue + purple mirrors the website brand gradient */}
      <View style={styles.wordmark}>
        <Text style={[styles.title, { color: BRAND_BLUE }]}>Stage</Text>
        <Text style={[styles.title, { color: BRAND_PURPLE }]}>worth</Text>
      </View>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>
        Discover your next show. Track your history.
      </Text>
    </View>
  );
});

type SocialButtonsProps = {
  googleLoading: boolean;
  appleLoading: boolean;
  onGooglePress: () => void;
  onApplePress: () => void;
};

const SocialButtons = memo(function SocialButtons({
  googleLoading,
  appleLoading,
  onGooglePress,
  onApplePress,
  googleButtonTextColor,
  googleBorderColor,
  googleButtonBackground,
  appleButtonStyle,
}: SocialButtonsProps & {
  googleButtonTextColor: string;
  googleBorderColor: string;
  googleButtonBackground: string;
  appleButtonStyle: AppleAuthentication.AppleAuthenticationButtonStyle;
}) {
  const anyLoading = googleLoading || appleLoading;

  return (
    <View style={styles.buttons}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.googleButton,
          {
            borderColor: googleBorderColor,
            backgroundColor: googleButtonBackground,
          },
          pressed && !anyLoading && styles.buttonPressed,
          anyLoading && styles.buttonDisabled,
        ]}
        onPress={onGooglePress}
        disabled={anyLoading}
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : null}
        {!googleLoading ? <FontAwesome name="google" size={18} color="#4285F4" /> : null}
        <Text style={[styles.googleButtonText, { color: googleButtonTextColor }]}>
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </Text>
      </Pressable>

      {Platform.OS === "ios" && (
        <View
          style={[styles.appleButtonContainer, anyLoading && styles.buttonDisabled]}
          // Prevent taps while another auth flow is mid-flight. Apple's native
          // button has no `disabled` prop, so we block at the container level.
          pointerEvents={anyLoading ? "none" : "auto"}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={appleButtonStyle}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={onApplePress}
          />
          {appleLoading ? (
            <View style={styles.appleLoadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
});

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const { data: session, isPending } = useSession();
  const { googleLoading, appleLoading, signInWithGoogle, signInWithApple } =
    useSocialAuth();

  // Redirect as soon as `session` exists. Only show the initial gate spinner when
  // we have no session yet and auth is still hydrating — not during background
  // revalidation (`isPending` can stay true after Google sign-in and was flashing
  // Android users with a second full-screen spinner after redirect).
  if (session) return <Redirect href="/" />;
  if (isPending) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={[styles.content, styles.centered]}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const appleButtonStyle =
    theme === "dark"
      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.content}>
        <Header subtitleColor={c.mutedText} />
        <SocialButtons
          googleLoading={googleLoading}
          appleLoading={appleLoading}
          onGooglePress={signInWithGoogle}
          onApplePress={signInWithApple}
          googleButtonTextColor={c.text}
          googleBorderColor={c.border}
          googleButtonBackground={c.surfaceElevated}
          appleButtonStyle={appleButtonStyle}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
    gap: 10,
  },
  appIcon: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 4,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  buttons: {
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 52,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  googleButton: {
    borderWidth: 1,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  appleButtonContainer: {
    position: "relative",
    minHeight: 52,
  },
  appleButton: {
    width: "100%",
    height: 52,
  },
  appleLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
  },
});

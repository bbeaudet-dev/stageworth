import { FontAwesome } from "@expo/vector-icons";
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

import { useSocialAuth } from "@/hooks/use-social-auth";
import { useSession } from "@/lib/auth-client";

const Header = memo(function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Theatre Diary</Text>
      <Text style={styles.subtitle}>The all-in-one app for theatre nerds</Text>
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
}: SocialButtonsProps) {
  const anyLoading = googleLoading || appleLoading;

  return (
    <View style={styles.buttons}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.googleButton,
          pressed && !anyLoading && styles.buttonPressed,
          anyLoading && styles.buttonDisabled,
        ]}
        onPress={onGooglePress}
        disabled={anyLoading}
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <FontAwesome name="google" size={18} color="#4285F4" />
        )}
        <Text style={styles.googleButtonText}>
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </Text>
      </Pressable>

      {Platform.OS === "ios" && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.appleButton,
            pressed && !anyLoading && styles.buttonPressed,
            anyLoading && styles.buttonDisabled,
          ]}
          onPress={onApplePress}
          disabled={anyLoading}
        >
          {appleLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome name="apple" size={20} color="#fff" />
          )}
          <Text style={styles.appleButtonText}>
            {appleLoading ? "Signing in..." : "Continue with Apple"}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

export default function SignInScreen() {
  const { data: session, isPending } = useSession();
  const { googleLoading, appleLoading, signInWithGoogle, signInWithApple } =
    useSocialAuth();

  // Wait for session state to resolve before rendering anything.
  // Without this guard the sign-in buttons appear briefly while a stored session
  // is still being validated, causing auth errors when the user taps them.
  if (isPending) return null;
  if (session) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Header />
        <SocialButtons
          googleLoading={googleLoading}
          appleLoading={appleLoading}
          onGooglePress={signInWithGoogle}
          onApplePress={signInWithApple}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  appleButton: {
    backgroundColor: "#000",
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

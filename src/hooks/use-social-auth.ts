import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import { authClient } from "@/lib/auth-client";

export function useSocialAuth() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const signInWithGoogle = async () => {
    let authSucceeded = false;
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();

      const response = await GoogleSignin.signIn();
      const { data } = response;

      if (data?.idToken) {
        const authResult = await authClient.signIn.social({
          provider: "google",
          idToken: { token: data.idToken },
        });

        if (authResult.error) {
          throw new Error(authResult.error.message || "Google sign-in failed");
        }

        authSucceeded = true;
        return { success: true, email: data.user?.email };
      }

      Alert.alert("Sign in cancelled");
      return null;
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error) {
        const code = (error as { code: string }).code;
        if (code === statusCodes.IN_PROGRESS) {
          Alert.alert("Sign-in already in progress");
        } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert("Play services not available");
        } else {
          Alert.alert((error as Error).message || "Google sign-in error");
        }
      } else if (error instanceof Error) {
        Alert.alert(error.message);
      }
      return null;
    } finally {
      if (!authSucceeded) {
        setGoogleLoading(false);
      }
    }
  };

  const signInWithApple = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Apple sign-in is only available on iOS");
      return null;
    }

    let authSucceeded = false;
    try {
      setAppleLoading(true);

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Apple sign-in is not available on this device");
        return null;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert("Apple sign-in failed: no identity token");
        return null;
      }

      // Apple returns the user's full name only on the very first sign-in. We
      // pass it through Better Auth's optional `name` field on the social call
      // so the user trigger can hydrate it on the Convex user row.
      const fullName = [
        credential.fullName?.givenName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const authResult = await authClient.signIn.social({
        provider: "apple",
        idToken: {
          token: credential.identityToken,
          ...(fullName ? { nonce: undefined } : {}),
        },
      });

      if (authResult.error) {
        throw new Error(authResult.error.message || "Apple sign-in failed");
      }

      authSucceeded = true;
      return { success: true, email: credential.email ?? undefined };
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "ERR_REQUEST_CANCELED"
      ) {
        // User cancelled — silent.
        return null;
      }
      if (error instanceof Error) {
        Alert.alert(error.message || "Apple sign-in error");
      }
      return null;
    } finally {
      if (!authSucceeded) {
        setAppleLoading(false);
      }
    }
  };

  return { googleLoading, appleLoading, signInWithGoogle, signInWithApple };
}

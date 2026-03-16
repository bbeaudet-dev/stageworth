import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { Alert } from "react-native";
import { authClient } from "@/lib/auth-client";

export function useSocialAuth() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const signInWithGoogle = async () => {
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
      setGoogleLoading(false);
    }
  };

  const signInWithApple = async () => {
    try {
      setAppleLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert("Could not get credentials from Apple");
        return null;
      }

      const authResult = await authClient.signIn.social({
        provider: "apple",
        idToken: { token: credential.identityToken },
      });

      if (authResult.error) {
        throw new Error(authResult.error.message || "Apple sign-in failed");
      }

      return { success: true, email: credential.email };
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        "code" in e &&
        (e as { code: string }).code === "ERR_REQUEST_CANCELED"
      ) {
        Alert.alert("Apple sign-in was cancelled");
      } else if (e instanceof Error) {
        Alert.alert(e.message || "Apple sign-in error");
      }
      return null;
    } finally {
      setAppleLoading(false);
    }
  };

  return { googleLoading, appleLoading, signInWithGoogle, signInWithApple };
}

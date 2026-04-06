import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useState } from "react";
import { Alert } from "react-native";
import { authClient } from "@/lib/auth-client";

export function useSocialAuth() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const appleLoading = false;

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

  const signInWithApple = async () => null;

  return { googleLoading, appleLoading, signInWithGoogle, signInWithApple };
}

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useMutation } from "convex/react";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { Alert } from "react-native";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export function useSocialAuth() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const hydrateSocialIdentity = useMutation(
    api.onboarding.hydrateSocialIdentity
  );

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

        // Google already populates `name` via better-auth, but we still need to
        // kick off the OAuth avatar import so the profile picture persists in
        // Convex storage instead of relying on the session-scoped URL.
        const googleUser = data.user;
        const googleName = googleUser?.name ?? undefined;
        const googleImage = googleUser?.photo ?? undefined;
        void hydrateSocialIdentity({
          name: googleName,
          imageUrl: googleImage ?? undefined,
        }).catch(() => {
          // Non-fatal; sign-in still succeeded.
        });

        return { success: true, email: googleUser?.email };
      }

      return null;
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error) {
        const code = (error as { code: string }).code;
        if (code === statusCodes.SIGN_IN_CANCELLED) {
          return null;
        }
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

      // Apple returns `fullName` only on the very first sign-in, and it's not
      // embedded in the ID token — better-auth therefore can't populate the
      // user's name on its own. We forward it here so the onboarding screen
      // can pre-fill from Apple instead of re-prompting the user (required by
      // Apple Sign-in HIG / App Store Review Guideline 4.8).
      const fullName = [
        credential.fullName?.givenName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (fullName) {
        void hydrateSocialIdentity({ name: fullName }).catch(() => {
          // Non-fatal; sign-in still succeeded and the user can set their name
          // from the onboarding screen if they want to.
        });
      }

      return { success: true, email: credential.email };
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        "code" in e &&
        (e as { code: string }).code === "ERR_REQUEST_CANCELED"
      ) {
        return null;
      }
      if (e instanceof Error) {
        Alert.alert(e.message || "Apple sign-in error");
      }
      return null;
    } finally {
      setAppleLoading(false);
    }
  };

  return { googleLoading, appleLoading, signInWithGoogle, signInWithApple };
}

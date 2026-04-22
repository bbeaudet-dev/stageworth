import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL!;

export const authClient = createAuthClient({
  baseURL: siteUrl,
  plugins: [
    expoClient({
      scheme: Constants.expoConfig?.scheme as string,
      storagePrefix: Constants.expoConfig?.scheme as string,
      storage: SecureStore,
    }),
    convexClient(),
  ],
});

export const useSession = authClient.useSession;

// ─── Intentional sign-out signal ───────────────────────────────────────────────
// The `(tabs)` layout keeps a short grace window between "session became null"
// and "redirect to /sign-in" to absorb the revalidation flap that better-auth
// produces when the app returns from the background. During a deliberate sign
// out we don't want that grace — the user tapped the button, they want off the
// app immediately — so call `markIntentionalSignOut()` right before
// `authClient.signOut()` and the layout will bypass the grace window.
let intentionalSignOut = false;

export function markIntentionalSignOut() {
  intentionalSignOut = true;
}

export function wasIntentionalSignOut(): boolean {
  return intentionalSignOut;
}

export function clearIntentionalSignOut() {
  intentionalSignOut = false;
}

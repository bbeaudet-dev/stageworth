import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;

export const authClient = createAuthClient({
  baseURL: siteUrl,
  plugins: [convexClient()],
});

export const { useSession, signIn, signOut } = authClient;

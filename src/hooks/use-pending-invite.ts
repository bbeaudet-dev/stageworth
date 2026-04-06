import { useMutation } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { api } from "@/convex/_generated/api";

export const PENDING_INVITE_KEY = "pendingInviteToken";

export function usePendingInvite() {
  const claimMutation = useMutation(api.invites.claimInviteLink);

  async function claimPendingInvite() {
    const token = await SecureStore.getItemAsync(PENDING_INVITE_KEY);
    if (!token) return;
    // Swallow errors — token may already be claimed or expired
    await claimMutation({ token }).catch(() => {});
    await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
  }

  return { claimPendingInvite };
}

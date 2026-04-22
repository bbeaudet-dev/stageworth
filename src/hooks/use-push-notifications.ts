import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Show banners + play sound when a notification arrives while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/**
 * Converts a push notification's `data` payload into an expo-router navigation
 * target. The `type` values here must stay in sync with the `data.type` keys
 * the backend sends in `notifyUser` / `sendPushNotification`.
 */
function getRouteFromNotificationData(
  data: Record<string, string>,
): { pathname: string; params?: Record<string, string> } | null {
  switch (data.type) {
    case "visit_tag":
      // From a push we can't check participant status cheaply — send users
      // to the accept screen by default. If they've already accepted, that
      // screen redirects them to the normal visit detail view.
      if (data.visitId) {
        return { pathname: "/accept-visit/[visitId]", params: { visitId: data.visitId } };
      }
      return null;
    case "visit_tag_accepted":
    case "visit_tag_declined":
      if (data.visitId) {
        return { pathname: "/visit/[visitId]", params: { visitId: data.visitId } };
      }
      return null;
    case "post_like":
      if (data.visitId) {
        return { pathname: "/visit/[visitId]", params: { visitId: data.visitId } };
      }
      return { pathname: "/notifications" };
    case "new_follow":
      if (data.actorUsername) {
        return { pathname: "/user/[username]", params: { username: data.actorUsername } };
      }
      return { pathname: "/notifications" };
    case "trip_invite":
    case "trip_invite_accepted":
    case "trip_invite_declined":
      if (data.tripId) {
        return { pathname: "/(tabs)/plan/[tripId]", params: { tripId: data.tripId } };
      }
      return null;
    case "show_announced":
    case "closing_soon":
      if (data.showId) {
        return { pathname: "/show/[showId]", params: { showId: data.showId } };
      }
      return null;
    default:
      return null;
  }
}

/**
 * Registers for push notifications and wires foreground / background /
 * cold-start tap handlers. `enabled` should track the user's auth state so we
 * never ping the save-token mutation for signed-out users.
 */
export function usePushNotifications(enabled: boolean = true) {
  const savePushToken = useMutation(api.notifications.savePushToken);
  const router = useRouter();
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    registerForPushNotifications()
      .then((token) => {
        if (token) savePushToken({ token }).catch(console.error);
      })
      .catch(console.error);

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, string>;
      const route = getRouteFromNotificationData(data);
      if (route) router.push(route as any);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {},
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        const route = getRouteFromNotificationData(data);
        if (route) router.push(route as any);
      },
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [enabled, savePushToken, router]);
}

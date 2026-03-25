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

function getRouteFromNotificationData(
  data: Record<string, string>
): { pathname: string; params?: Record<string, string> } | null {
  if (data.type === "visit_tag" && data.visitId) {
    return { pathname: "/visit/[visitId]", params: { visitId: data.visitId } };
  }
  if (data.type === "new_follow" && data.actorUsername) {
    return {
      pathname: "/user/[username]",
      params: { username: data.actorUsername },
    };
  }
  return null;
}

export function usePushNotifications() {
  const savePushToken = useMutation(api.notifications.savePushToken);
  const router = useRouter();
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
    registerForPushNotifications()
      .then((token) => {
        if (token) savePushToken({ token }).catch(console.error);
      })
      .catch(console.error);

    // Cold-start: app was closed when user tapped the notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, string>;
      const route = getRouteFromNotificationData(data);
      if (route) router.push(route as any);
    });

    // Notification received while app is foregrounded.
    // Banner shows automatically via setNotificationHandler above.
    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {}
    );

    // User tapped a notification while app was foregrounded or backgrounded.
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        const route = getRouteFromNotificationData(data);
        if (route) router.push(route as any);
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [savePushToken, router]);
}

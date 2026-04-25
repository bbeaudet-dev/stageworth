import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { APP_STORE_URLS, LEGAL_URLS } from "@/constants/urls";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authClient, markIntentionalSignOut, useSession } from "@/lib/auth-client";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.82;

type SettingsDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

type MenuRowProps = {
  icon: IconSymbolName;
  label: string;
  onPress: () => void;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  surfaceColor: string;
  iconColor: string;
};

function MenuRow({
  icon,
  label,
  onPress,
  textColor,
  mutedColor,
  borderColor,
  surfaceColor,
  iconColor,
}: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: surfaceColor, borderColor },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.menuRowIcon, { backgroundColor: iconColor + "18" }]}>
        <IconSymbol name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.menuRowText}>
        <Text style={[styles.menuRowLabel, { color: textColor }]}>{label}</Text>
      </View>
      <IconSymbol name="chevron.right" size={14} color={mutedColor} />
    </Pressable>
  );
}

export function SettingsDrawer({ visible, onClose }: SettingsDrawerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const myProfile = useQuery(api.social.profiles.getMyProfile);
  const removePushToken = useMutation(api.notifications.removePushToken);

  const [isSigningOut, setIsSigningOut] = useState(false);

  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  useEffect(() => {
    if (visible) {
      translateX.stopAnimation();
      overlayOpacity.stopAnimation();
      translateX.setValue(DRAWER_WIDTH);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 280,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateX, overlayOpacity]);

  const navigate = (path: string) => {
    onClose();
    router.push(path as any);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await removePushToken().catch(() => {});
      onClose();
      await new Promise((resolve) => setTimeout(resolve, 220));
      // Tell the tabs layout this null-session is deliberate so it skips the
      // revalidation grace and redirects to /sign-in immediately.
      markIntentionalSignOut();
      await authClient.signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const iconColor = c.accent;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: c.background,
              width: DRAWER_WIDTH,
              transform: [{ translateX }],
              paddingTop: insets.top,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: c.border }]}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <IconSymbol name="xmark" size={18} color={c.mutedText} />
            </Pressable>
            <Text style={[styles.drawerTitle, { color: c.text }]}>Settings</Text>
          </View>

          <View style={styles.drawerBody}>
            <View style={styles.menuList}>
              <MenuRow
                icon="person.fill"
                label="Account Info"
                onPress={() => navigate("/edit-profile")}
                textColor={c.text}
                mutedColor={c.mutedText}
                borderColor={c.border}
                surfaceColor={c.surfaceElevated}
                iconColor={iconColor}
              />
            <MenuRow
              icon="bell.fill"
              label="Notifications"
              onPress={() => navigate("/notification-preferences")}
              textColor={c.text}
              mutedColor={c.mutedText}
              borderColor={c.border}
              surfaceColor={c.surfaceElevated}
              iconColor={iconColor}
            />
            <MenuRow
              icon="theatermasks.fill"
              label="Theatre Preferences"
              onPress={() => navigate("/preferences")}
              textColor={c.text}
              mutedColor={c.mutedText}
              borderColor={c.border}
              surfaceColor={c.surfaceElevated}
              iconColor={iconColor}
            />
            <MenuRow
              icon="clock.arrow.circlepath"
              label="Recommendation History"
              onPress={() => navigate("/recommendation-history")}
              textColor={c.text}
              mutedColor={c.mutedText}
              borderColor={c.border}
              surfaceColor={c.surfaceElevated}
              iconColor={iconColor}
            />
            <MenuRow
              icon="person.fill.badge.plus"
              label="Invite a Friend"
              onPress={() => navigate("/invite-friend")}
              textColor={c.text}
              mutedColor={c.mutedText}
              borderColor={c.border}
              surfaceColor={c.surfaceElevated}
              iconColor={iconColor}
            />
            <MenuRow
              icon="hand.raised.fill"
              label="Blocked Users"
              onPress={() => navigate("/blocked-users")}
              textColor={c.text}
              mutedColor={c.mutedText}
              borderColor={c.border}
              surfaceColor={c.surfaceElevated}
              iconColor={iconColor}
            />
            {Platform.OS === "ios" ? (
              <MenuRow
                icon="star.fill"
                label="Rate Stageworth"
                onPress={() => {
                  onClose();
                  // itms-apps:// opens the App Store review composer; if the user
                  // is on a simulator or somehow can't open it, fall back to the
                  // public listing in their browser/App Store.
                  void Linking.openURL(APP_STORE_URLS.writeReview).catch(() => {
                    void Linking.openURL(APP_STORE_URLS.listing);
                  });
                }}
                textColor={c.text}
                mutedColor={c.mutedText}
                borderColor={c.border}
                surfaceColor={c.surfaceElevated}
                iconColor={iconColor}
              />
            ) : null}
            <MenuRow
              icon="shield"
              label="Privacy Policy"
              onPress={() => {
                onClose();
                void Linking.openURL(LEGAL_URLS.privacyPolicy);
              }}
              textColor={c.text}
              mutedColor={c.mutedText}
              borderColor={c.border}
              surfaceColor={c.surfaceElevated}
              iconColor={iconColor}
            />
            <MenuRow
              icon="doc.text"
              label="Terms of Service"
              onPress={() => {
                onClose();
                void Linking.openURL(LEGAL_URLS.termsOfService);
              }}
              textColor={c.text}
              mutedColor={c.mutedText}
              borderColor={c.border}
              surfaceColor={c.surfaceElevated}
              iconColor={iconColor}
            />
            </View>

            {/* Account info */}
            <View style={[styles.accountCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
              <Text style={[styles.signedInLabel, { color: c.mutedText }]}>Signed in as</Text>
              {myProfile?.username ? (
                <Text style={[styles.accountUsername, { color: c.text }]}>@{myProfile.username}</Text>
              ) : null}
              <Text style={[styles.accountEmail, { color: c.mutedText }]}>
                {session?.user?.email ?? ""}
              </Text>
              <Pressable
                style={[styles.signOutBtn, { borderColor: c.danger, opacity: isSigningOut ? 0.6 : 1 }]}
                onPress={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <ActivityIndicator size="small" color={c.danger} />
                ) : (
                  <Text style={[styles.signOutBtnText, { color: c.danger }]}>Sign Out</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  drawerBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  closeBtn: {
    padding: 4,
  },
  drawerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  accountCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  signedInLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  accountUsername: {
    fontSize: 17,
    fontWeight: "700",
  },
  accountEmail: {
    fontSize: 13,
  },
  signOutBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  menuList: {
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 16,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  menuRowText: {
    flex: 1,
  },
  menuRowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});

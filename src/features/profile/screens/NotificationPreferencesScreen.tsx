import { useMutation, useQuery } from "convex/react";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { useToast } from "@/components/Toast";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNotifyProfileDrawerReopenOnUnmount } from "@/features/profile/reopenSettingsDrawer";

type NotifSettings = {
  follows: boolean;
  visitTags: boolean;
  tripInvites: boolean;
  closingSoon: boolean;
  showAnnounced: boolean;
};

const DEFAULT_SETTINGS: NotifSettings = {
  follows: true,
  visitTags: true,
  tripInvites: true,
  closingSoon: true,
  showAnnounced: true,
};

type ToggleRowProps = {
  icon: IconSymbolName;
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  surfaceColor: string;
  accentColor: string;
  iconBg: string;
};

function ToggleRow({
  icon,
  label,
  subtitle,
  value,
  onValueChange,
  textColor,
  mutedColor,
  borderColor,
  surfaceColor,
  accentColor,
  iconBg,
}: ToggleRowProps) {
  return (
    <View style={[styles.toggleRow, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={[styles.toggleRowIcon, { backgroundColor: iconBg }]}>
        <IconSymbol name={icon} size={17} color={accentColor} />
      </View>
      <View style={styles.toggleRowText}>
        <Text style={[styles.toggleRowLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.toggleRowSubtitle, { color: mutedColor }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: borderColor, true: accentColor }}
        thumbColor="#fff"
        ios_backgroundColor={borderColor}
      />
    </View>
  );
}

export default function NotificationPreferencesScreen() {
  useNotifyProfileDrawerReopenOnUnmount();
  const prefs = useQuery(api.userPreferences.getUserPreferences, {});
  const updateNotifSettings = useMutation(api.userPreferences.updateNotificationSettings);
  const { showToast } = useToast();

  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const iconBg = c.accent + "18";

  useEffect(() => {
    if (initialized || prefs === undefined) return;
    if (prefs?.notificationSettings) {
      setSettings(prefs.notificationSettings);
    }
    setInitialized(true);
  }, [prefs, initialized]);

  const toggle = (key: keyof NotifSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNotifSettings(settings);
      showToast({ message: "Notification preferences saved" });
    } catch {
      showToast({ message: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  };

  const commonProps = {
    textColor: c.text,
    mutedColor: c.mutedText,
    borderColor: c.border,
    surfaceColor: c.surfaceElevated,
    accentColor: c.accent,
    iconBg,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Notifications",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: c.mutedText }]}>
          Choose which notifications you would like to receive.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedText }]}>Social</Text>
          <ToggleRow
            icon="person.fill.badge.plus"
            label="New Followers"
            subtitle="When someone follows you"
            value={settings.follows}
            onValueChange={() => toggle("follows")}
            {...commonProps}
          />
          <ToggleRow
            icon="tag.fill"
            label="Visit Tags"
            subtitle="When someone tags you in a visit"
            value={settings.visitTags}
            onValueChange={() => toggle("visitTags")}
            {...commonProps}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedText }]}>Trips</Text>
          <ToggleRow
            icon="airplane"
            label="Trip Invitations"
            subtitle="Invites, acceptances, and declines"
            value={settings.tripInvites}
            onValueChange={() => toggle("tripInvites")}
            {...commonProps}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedText }]}>Shows</Text>
          <ToggleRow
            icon="calendar.badge.exclamationmark"
            label="Closing Soon"
            subtitle="Shows you've saved that are closing"
            value={settings.closingSoon}
            onValueChange={() => toggle("closingSoon")}
            {...commonProps}
          />
          <ToggleRow
            icon="megaphone.fill"
            label="New Announcements"
            subtitle="Newly announced productions"
            value={settings.showAnnounced}
            onValueChange={() => toggle("showAnnounced")}
            {...commonProps}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveBtn, { backgroundColor: c.accent, opacity: isSaving ? 0.6 : 1 }]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={c.onAccent} />
          ) : (
            <Text style={[styles.saveBtnText, { color: c.onAccent }]}>Save Preferences</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 6,
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  section: {
    gap: 8,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRowText: {
    flex: 1,
    gap: 2,
  },
  toggleRowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleRowSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

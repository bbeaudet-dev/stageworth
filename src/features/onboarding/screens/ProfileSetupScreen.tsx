import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/components/Toast";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useUsernameAvailability } from "@/features/onboarding/hooks/useUsernameAvailability";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/lib/auth-client";
import { shouldUseOauthProfileImageUrl } from "@/utils/oauthProfilePhoto";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const profile = useQuery(api.social.profiles.getMyProfile);
  const generateUploadUrl = useMutation(api.onboarding.generateAvatarUploadUrl);
  const completeProfilePhase = useMutation(api.onboarding.completeProfilePhase);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  // Local preview URL (for newly picked images before upload completes).
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  // Uploaded storage id for a freshly picked image.
  const [uploadedAvatarId, setUploadedAvatarId] = useState<Id<"_storage"> | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [didInitialize, setDidInitialize] = useState(false);

  useEffect(() => {
    if (!profile || didInitialize) return;
    setName(profile.name ?? "");
    setUsername(profile.username ?? "");
    setDidInitialize(true);
  }, [profile, didInitialize]);

  const sessionImageUrl =
    typeof session?.user?.image === "string" ? session.user.image : undefined;
  const oauthAvatar = shouldUseOauthProfileImageUrl(sessionImageUrl)
    ? sessionImageUrl
    : null;
  const displayAvatarUri =
    localAvatarUri ?? profile?.avatarUrl ?? oauthAvatar ?? null;

  const usernameAvailability = useUsernameAvailability(username);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo access to choose a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setLocalAvatarUri(asset.uri);

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? blob.type ?? "image/jpeg" },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed (${uploadResponse.status})`);
      }
      const { storageId } = (await uploadResponse.json()) as {
        storageId: Id<"_storage">;
      };
      setUploadedAvatarId(storageId);
    } catch (err) {
      setLocalAvatarUri(null);
      const message = err instanceof Error ? err.message : "Upload failed";
      Alert.alert("Couldn't upload photo", message);
    } finally {
      setIsUploading(false);
    }
  };

  const trimmedName = name.trim();
  const canConfirm =
    !!trimmedName &&
    usernameAvailability.isAcceptable &&
    !isUploading &&
    !isSaving;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsSaving(true);
    try {
      await completeProfilePhase({
        name: trimmedName,
        username: usernameAvailability.sanitized || username,
        avatarImage: uploadedAvatarId ?? undefined,
      });
      router.replace("/(onboarding)/shows");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      showToast({ message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile && !didInitialize) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
        edges={["top", "bottom"]}
      >
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: c.text }]}>Welcome!</Text>
          <Text style={[styles.subtitle, { color: c.mutedText }]}>
            {"Let's set up your profile."}
          </Text>

          <View style={styles.avatarSection}>
            <Pressable
              style={[
                styles.avatar,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
              onPress={handlePickAvatar}
              disabled={isUploading || isSaving}
            >
              {displayAvatarUri ? (
                <Image
                  source={{ uri: displayAvatarUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <IconSymbol name="person.fill" size={64} color={c.mutedText} />
              )}
              {isUploading ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </Pressable>
            <Pressable onPress={handlePickAvatar} disabled={isUploading || isSaving}>
              <Text style={[styles.avatarHint, { color: c.accent }]}>
                {displayAvatarUri ? "Change photo" : "Add photo"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.mutedText }]}>Full name</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.surface, borderColor: c.border, color: c.text },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={c.mutedText}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={80}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.mutedText }]}>Username</Text>
            <View
              style={[
                styles.usernameRow,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Text style={[styles.usernameAt, { color: c.mutedText }]}>@</Text>
              <TextInput
                style={[styles.usernameInput, { color: c.text }]}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={c.mutedText}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={20}
              />
            </View>
            <UsernameStatusLine
              status={usernameAvailability.status}
              accent={c.accent}
              mutedText={c.mutedText}
              danger="#dc2626"
            />
          </View>

          <Pressable
            style={[
              styles.confirmBtn,
              { backgroundColor: canConfirm ? c.accent : c.surface },
              !canConfirm && { borderColor: c.border, borderWidth: StyleSheet.hairlineWidth },
            ]}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            <Text
              style={[
                styles.confirmText,
                { color: canConfirm ? c.onAccent : c.mutedText },
              ]}
            >
              {isSaving ? "Saving…" : "Confirm"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function UsernameStatusLine({
  status,
  accent,
  mutedText,
  danger,
}: {
  status: ReturnType<typeof useUsernameAvailability>["status"];
  accent: string;
  mutedText: string;
  danger: string;
}) {
  let text = "";
  let color = mutedText;
  switch (status.state) {
    case "checking":
      text = "Checking…";
      break;
    case "available":
      text = "Available";
      color = accent;
      break;
    case "taken":
      text = "That username is taken";
      color = danger;
      break;
    case "invalid":
      text = "Username must be at least 3 characters";
      color = danger;
      break;
    default:
      text = "Letters, numbers, and underscores only";
  }
  return <Text style={[styles.statusText, { color }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 8,
  },
  avatarSection: {
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    fontSize: 14,
    fontWeight: "600",
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 16,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 13,
  },
  usernameAt: {
    fontSize: 16,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
  },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

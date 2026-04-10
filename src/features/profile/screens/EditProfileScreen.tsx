import { useMutation, useQuery } from "convex/react";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Keyboard,
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

import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useToast } from "@/components/Toast";
import { useNotifyProfileDrawerReopenOnUnmount } from "@/features/profile/reopenSettingsDrawer";

export default function EditProfileScreen() {
  useNotifyProfileDrawerReopenOnUnmount();
  const myProfile = useQuery(api.social.profiles.getMyProfile);
  const updateMyProfile = useMutation(api.social.profiles.updateMyProfile);
  const { showToast } = useToast();

  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  useEffect(() => {
    if (!myProfile) return;
    setNameDraft(myProfile.name ?? "");
    setBioDraft(myProfile.bio ?? "");
    setLocationDraft(myProfile.location ?? "");
  }, [myProfile]);

  const handleSave = async () => {
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      await updateMyProfile({
        name: nameDraft,
        bio: bioDraft,
        location: locationDraft,
      });
      showToast({ message: "Profile saved" });
    } catch {
      showToast({ message: "Failed to save profile" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Edit Profile",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedText }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Your name"
                placeholderTextColor={c.mutedText}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedText }]}>Bio</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                value={bioDraft}
                onChangeText={setBioDraft}
                placeholder="Tell people a bit about yourself"
                placeholderTextColor={c.mutedText}
                multiline
                returnKeyType="default"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedText }]}>Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                value={locationDraft}
                onChangeText={setLocationDraft}
                placeholder="City, State"
                placeholderTextColor={c.mutedText}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: c.accent, opacity: isSaving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={[styles.saveBtnText, { color: c.onAccent }]}>
              {isSaving ? "Saving…" : "Save Profile"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingTop: 11,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

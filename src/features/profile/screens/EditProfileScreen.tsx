import { useMutation, useQuery } from "convex/react";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { authClient, useSession } from "@/lib/auth-client";

export default function EditProfileScreen() {
  const { data: session, isPending } = useSession();
  const myProfile = useQuery(api.social.profiles.getMyProfile);
  const updateMyProfile = useMutation(api.social.profiles.updateMyProfile);
  const removePushToken = useMutation(api.notifications.removePushToken);
  const deleteMyAccount = useMutation(api.account.deleteMyAccount);
  const { showToast } = useToast();

  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const runAccountDeletion = async () => {
    setIsDeletingAccount(true);
    try {
      await removePushToken().catch(() => {});
      await deleteMyAccount();
      await authClient.signOut().catch(() => {});
    } catch (error) {
      setIsDeletingAccount(false);
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't delete your account. Please try again or contact support.";
      Alert.alert("Account deletion failed", message);
    }
  };

  const confirmAccountDeletion = () => {
    if (isDeletingAccount) return;
    Alert.alert(
      "Delete Account",
      "This permanently removes your profile, visits, rankings, lists, trips, and activity. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "Last chance — your account and all associated data will be permanently deleted.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Permanently Delete",
                  style: "destructive",
                  onPress: () => {
                    void runAccountDeletion();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (!isPending && !session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Account",
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

          <View style={[styles.dangerSection, { borderColor: c.danger }]}>
            <Text style={[styles.dangerTitle, { color: c.danger }]}>Delete Account</Text>
            <Text style={[styles.dangerBody, { color: c.mutedText }]}>
              Permanently delete your account and all associated data, including your visits, rankings, lists, trips, and activity. This cannot be undone.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete account"
              style={[
                styles.deleteBtn,
                { borderColor: c.danger },
                isDeletingAccount && { opacity: 0.6 },
              ]}
              onPress={confirmAccountDeletion}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? (
                <ActivityIndicator size="small" color={c.danger} />
              ) : (
                <Text style={[styles.deleteBtnText, { color: c.danger }]}>
                  Delete Account
                </Text>
              )}
            </Pressable>
          </View>
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
  dangerSection: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  dangerBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  deleteBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

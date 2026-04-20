import { useMutation, useQuery } from "convex/react";
import { Redirect, Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { styles } from "@/features/profile/styles";
import { AccountSection } from "@/features/profile/components/AccountSection";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authClient, useSession } from "@/lib/auth-client";

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const myProfile = useQuery(api.social.profiles.getMyProfile);
  const updateMyProfile = useMutation(api.social.profiles.updateMyProfile);
  const removePushToken = useMutation(api.notifications.removePushToken);
  const deleteMyAccount = useMutation(api.account.deleteMyAccount);

  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (!myProfile) return;
    setNameDraft(myProfile.name ?? "");
    setBioDraft(myProfile.bio ?? "");
    setLocationDraft(myProfile.location ?? "");
  }, [myProfile]);

  const handleSaveProfile = async () => {
    Keyboard.dismiss();
    setIsSavingProfile(true);
    try {
      await updateMyProfile({
        name: nameDraft,
        bio: bioDraft,
        location: locationDraft,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await removePushToken().catch(() => {});
      await authClient.signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const runAccountDeletion = async () => {
    setIsDeletingAccount(true);
    try {
      // Clear the push token first — after the auth record is gone we'd no
      // longer be able to authenticate the mutation.
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

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const surfaceColor = Colors[theme].surfaceElevated;
  const inputBackground = Colors[theme].surface;
  const inputBorder = Colors[theme].border;
  const primaryButtonBg = Colors[theme].accent;
  const primaryButtonText = Colors[theme].onAccent;
  const dangerColor = Colors[theme].danger;
  const mutedTextColor = Colors[theme].mutedText;

  if (!isPending && !session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Account Settings",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, { backgroundColor: surfaceColor, borderColor: inputBorder }]}>
          <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Edit profile</Text>
          <TextInput
            style={[
              styles.inlineInput,
              { backgroundColor: inputBackground, borderColor: inputBorder, color: primaryTextColor },
            ]}
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Display name"
          />
          <TextInput
            style={[
              styles.inlineInput,
              styles.multilineInput,
              { backgroundColor: inputBackground, borderColor: inputBorder, color: primaryTextColor },
            ]}
            value={bioDraft}
            onChangeText={setBioDraft}
            placeholder="Bio"
            multiline
          />
          <TextInput
            style={[
              styles.inlineInput,
              { backgroundColor: inputBackground, borderColor: inputBorder, color: primaryTextColor },
            ]}
            value={locationDraft}
            onChangeText={setLocationDraft}
            placeholder="Location"
          />
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: primaryButtonBg },
              isSavingProfile && styles.disabledButton,
            ]}
            onPress={handleSaveProfile}
            disabled={isSavingProfile}
          >
            <Text style={[styles.primaryButtonText, { color: primaryButtonText }]}>
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.section, { backgroundColor: surfaceColor, borderColor: inputBorder }]}
          onPress={() => router.push("/preferences")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Theatre Preferences</Text>
              <Text style={{ fontSize: 13, color: Colors[theme].mutedText }}>
                Tell us what matters most to you in a show
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: Colors[theme].mutedText, fontWeight: "300" }}>›</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.section, { backgroundColor: surfaceColor, borderColor: inputBorder }]}
          onPress={() => router.push("/recommendation-history")}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Recommendation History</Text>
              <Text style={{ fontSize: 13, color: Colors[theme].mutedText }}>
                AI-generated show recommendations you&apos;ve requested
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: Colors[theme].mutedText, fontWeight: "300" }}>›</Text>
          </View>
        </Pressable>
        <AccountSection
          email={session?.user?.email ?? "Unknown"}
          username={myProfile?.username}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
        />

        <View
          style={[
            styles.section,
            { backgroundColor: surfaceColor, borderColor: dangerColor },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: dangerColor }]}>Delete Account</Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: mutedTextColor }}>
            Permanently delete your account and all associated data, including
            your visits, rankings, lists, trips, and activity. This cannot be
            undone.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            style={[
              styles.secondaryButton,
              { borderColor: dangerColor },
              isDeletingAccount && styles.disabledButton,
            ]}
            onPress={confirmAccountDeletion}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? (
              <ActivityIndicator size="small" color={dangerColor} />
            ) : (
              <Text style={[styles.secondaryButtonText, { color: dangerColor }]}>
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

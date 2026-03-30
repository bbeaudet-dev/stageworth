import { useMutation, useQuery } from "convex/react";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { styles } from "@/features/profile/styles";
import { AccountSection } from "@/features/profile/components/AccountSection";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authClient, useSession } from "@/lib/auth-client";

export default function AccountSettingsScreen() {
  const { data: session, isPending } = useSession();
  const myProfile = useQuery(api.profiles.getMyProfile);
  const updateMyProfile = useMutation(api.profiles.updateMyProfile);
  const removePushToken = useMutation(api.notifications.removePushToken);

  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const backgroundColor = Colors[theme].background;
  const primaryTextColor = Colors[theme].text;
  const surfaceColor = Colors[theme].surfaceElevated;
  const inputBackground = Colors[theme].surface;
  const inputBorder = Colors[theme].border;
  const primaryButtonBg = Colors[theme].accent;
  const primaryButtonText = "#fff";

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
        <AccountSection
          email={session?.user?.email ?? "Unknown"}
          username={myProfile?.username}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

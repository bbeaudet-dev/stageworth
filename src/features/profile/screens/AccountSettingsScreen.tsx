import { useMutation, useQuery } from "convex/react";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { styles } from "@/features/profile/styles";
import { AccountSection } from "@/features/profile/components/AccountSection";
import { authClient, useSession } from "@/lib/auth-client";

export default function AccountSettingsScreen() {
  const { data: session, isPending } = useSession();
  const myProfile = useQuery(api.profiles.getMyProfile);
  const updateMyProfile = useMutation(api.profiles.updateMyProfile);

  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!myProfile) return;
    setNameDraft(myProfile.name ?? "");
    setBioDraft(myProfile.bio ?? "");
    setLocationDraft(myProfile.location ?? "");
  }, [myProfile]);

  const handleSaveProfile = async () => {
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
    await authClient.signOut();
  };

  if (!isPending && !session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Account Settings",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit profile</Text>
          <TextInput
            style={styles.inlineInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Display name"
          />
          <TextInput
            style={[styles.inlineInput, styles.multilineInput]}
            value={bioDraft}
            onChangeText={setBioDraft}
            placeholder="Bio"
            multiline
          />
          <TextInput
            style={styles.inlineInput}
            value={locationDraft}
            onChangeText={setLocationDraft}
            placeholder="Location"
          />
          <Pressable
            style={[styles.primaryButton, isSavingProfile && styles.disabledButton]}
            onPress={handleSaveProfile}
            disabled={isSavingProfile}
          >
            <Text style={styles.primaryButtonText}>
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </Text>
          </Pressable>
        </View>
        <AccountSection
          email={session?.user?.email ?? "Unknown"}
          username={myProfile?.username}
          onSignOut={handleSignOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { api } from "@/convex/_generated/api";
import { getInitials } from "@/features/profile/components/ProfileHeader";

interface ProfileTabIconProps {
  color: string;
  size?: number;
}

export function ProfileTabIcon({ color, size = 28 }: ProfileTabIconProps) {
  const myProfile = useQuery(api.profiles.getMyProfile);
  const avatarUrl = myProfile?.avatarUrl;

  if (avatarUrl) {
    return (
      <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
        <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
      </View>
    );
  }

  const initials = myProfile
    ? getInitials(myProfile.name, myProfile.username)
    : "";

  return (
    <View
      style={[
        styles.avatarWrap,
        styles.initialsWrap,
        { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: color + "18" },
      ]}
    >
      <Text style={[styles.initialsText, { color, fontSize: size * 0.38 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    overflow: "hidden",
    borderWidth: 1.5,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  initialsWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontWeight: "700",
  },
});

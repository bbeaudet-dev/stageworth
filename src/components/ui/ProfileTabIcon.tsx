import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { api } from "@/convex/_generated/api";
import { IconSymbol } from "@/components/ui/icon-symbol";

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

  return <IconSymbol size={size} name="person.fill" color={color} />;
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
});

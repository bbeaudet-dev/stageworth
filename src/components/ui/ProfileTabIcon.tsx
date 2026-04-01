import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import { shouldUseOauthProfileImageUrl } from "@/utils/oauthProfilePhoto";

interface ProfileTabIconProps {
  color: string;
  size?: number;
}

export function ProfileTabIcon({ color, size = 28 }: ProfileTabIconProps) {
  const { data: session } = useSession();
  const myProfile = useQuery(api.profiles.getMyProfile);

  const rawSessionImage =
    typeof session?.user?.image === "string" ? session.user.image : undefined;
  const oauthUrl = shouldUseOauthProfileImageUrl(rawSessionImage)
    ? rawSessionImage
    : null;

  const avatarUrl = myProfile?.avatarUrl ?? oauthUrl ?? null;

  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const iconSize = Math.max(14, Math.round(size * 0.55));

  if (avatarUrl && !imageFailed) {
    return (
      <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatarImg}
          contentFit="cover"
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.avatarWrap,
        styles.iconWrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          backgroundColor: color + "18",
        },
      ]}
    >
      <IconSymbol name="person.fill" size={iconSize} color={color} />
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
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});

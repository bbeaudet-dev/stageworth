import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useProfileListsData } from "@/features/profile/hooks/useProfileListsData";
import { styles } from "@/features/profile/styles";
import { ListsSection } from "@/features/profile/components/ListsSection";

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const params = useLocalSearchParams<{ createList?: string }>();
  const myProfile = useQuery(api.profiles.getMyProfile);
  const { profileLists, visibleLists, initializeSystemLists, createCustomList, toggleVisibility } =
    useProfileListsData();

  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isShowingCreateInput, setIsShowingCreateInput] = useState(false);
  const [pendingVisibilityIds, setPendingVisibilityIds] = useState<Set<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    initializeSystemLists().catch(() => undefined);
  }, [initializeSystemLists]);

  useEffect(() => {
    if (params.createList !== "1") return;
    setIsShowingCreateInput(true);
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
      router.setParams({ createList: undefined });
    }, 40);
    return () => clearTimeout(timeout);
  }, [params.createList, router]);

  const handleCreateCustomList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed || isCreatingList) return;
    setErrorMessage(null);
    setIsCreatingList(true);
    try {
      const listId = await createCustomList({ name: trimmed, isPublic: false });
      setNewListName("");
      setIsShowingCreateInput(false);
      router.push({
        pathname: "/list/[listId]",
        params: { listId: String(listId), name: trimmed },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create list");
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleToggleVisibility = async (listId: Id<"userLists">, isPublic: boolean) => {
    const key = String(listId);
    setPendingVisibilityIds((prev) => new Set(prev).add(key));
    try {
      await toggleVisibility(listId, isPublic);
    } finally {
      setPendingVisibilityIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const displayName = myProfile?.name?.trim() || myProfile?.username || "You";
  const username = myProfile?.username ?? "";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.profileHeaderRow}>
          <Text style={styles.title}>Profile</Text>
          <Pressable
            style={styles.menuButton}
            onPress={() => router.push("/account-settings")}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </Pressable>
        </View>
        <View style={styles.profileHero}>
          {myProfile?.avatarUrl ? (
            <Image source={{ uri: myProfile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials || "U"}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{displayName}</Text>
          {username ? <Text style={styles.profileUsername}>@{username}</Text> : null}
          <View style={styles.profileCountsRow}>
            <Text style={styles.profileCountText}>
              {myProfile?.followerCount ?? 0} followers
            </Text>
            <Text style={styles.profileCountText}>
              {myProfile?.followingCount ?? 0} following
            </Text>
          </View>
          {myProfile?.bio ? <Text style={styles.profileBio}>{myProfile.bio}</Text> : null}
          {myProfile?.location ? <Text style={styles.profileLocation}>{myProfile.location}</Text> : null}
        </View>
        <ListsSection
          isShowingCreateInput={isShowingCreateInput}
          setIsShowingCreateInput={setIsShowingCreateInput}
          newListName={newListName}
          setNewListName={setNewListName}
          isCreatingList={isCreatingList}
          onCreateCustomList={handleCreateCustomList}
          inputRef={inputRef}
          profileListsLoading={profileLists === undefined}
          visibleLists={visibleLists}
          pendingVisibilityIds={pendingVisibilityIds}
          onToggleVisibility={handleToggleVisibility}
          openList={(list) =>
            router.push({
              pathname: "/list/[listId]",
              params: {
                listId: String(list._id),
                name: list.name,
                seen: list.isSeen ? "1" : "0",
                systemKey: list.systemKey ?? "",
              },
            })
          }
          errorMessage={errorMessage}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

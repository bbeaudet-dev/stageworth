import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Id } from "@/convex/_generated/dataModel";
import { useProfileListsData } from "@/features/profile/hooks/useProfileListsData";
import { styles } from "@/features/profile/styles";
import { ListsSection } from "@/features/profile/components/ListsSection";
import { AccountSection } from "@/features/profile/components/AccountSection";
import { authClient, useSession } from "@/lib/auth-client";

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const params = useLocalSearchParams<{ createList?: string }>();
  const { data: session } = useSession();
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

  const handleSignOut = async () => {
    await authClient.signOut();
  };

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Profile</Text>
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
        <AccountSection
          email={session?.user?.email ?? "Unknown"}
          name={session?.user?.name ?? undefined}
          onSignOut={handleSignOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

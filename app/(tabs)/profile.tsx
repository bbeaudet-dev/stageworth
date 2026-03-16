import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { authClient, useSession } from "@/lib/auth-client";

type SystemListRow = {
  _id: Id<"userLists">;
  name: string;
  systemKey?: string;
  isPublic: boolean;
  showCount: number;
};

type CustomListRow = {
  _id: Id<"userLists">;
  name: string;
  isPublic: boolean;
  showCount: number;
};

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const params = useLocalSearchParams<{ createList?: string }>();
  const { data: session } = useSession();
  const profileLists = useQuery(api.lists.getProfileLists);
  const createCustomList = useMutation(api.lists.createCustomList);
  const initializeSystemLists = useMutation(api.lists.initializeSystemLists);
  const setListVisibility = useMutation(api.lists.setListVisibility);

  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isShowingCreateInput, setIsShowingCreateInput] = useState(false);
  const [pendingVisibilityIds, setPendingVisibilityIds] = useState<Set<string>>(
    () => new Set()
  );
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

  const systemLists = useMemo(
    () => (profileLists?.systemLists ?? []) as SystemListRow[],
    [profileLists]
  );
  const customLists = useMemo(
    () => (profileLists?.customLists ?? []) as CustomListRow[],
    [profileLists]
  );
  const visibleLists = useMemo(() => {
    const seenRow = profileLists
      ? [
          {
            _id: "seen" as const,
            name: "Seen",
            isPublic: false,
            showCount: profileLists.seen.showCount,
            isSeen: true,
            systemKey: "seen",
          },
        ]
      : [];

    const dynamicSystem = systemLists.map((list) => ({
      _id: list._id,
      name: list.name,
      isPublic: list.isPublic,
      showCount: list.showCount,
      isSeen: false,
      systemKey: list.systemKey,
    }));

    const custom = customLists.map((list) => ({
      _id: list._id,
      name: list.name,
      isPublic: list.isPublic,
      showCount: list.showCount,
      isSeen: false,
      systemKey: undefined,
    }));

    return [...seenRow, ...dynamicSystem, ...custom];
  }, [customLists, profileLists, systemLists]);

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
    setPendingVisibilityIds((prev) => new Set(prev).add(listId));
    try {
      await setListVisibility({ listId, isPublic: !isPublic });
    } finally {
      setPendingVisibilityIds((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    }
  };

  const openList = (
    listId: string,
    name: string,
    isSeen: boolean,
    systemKey?: string
  ) => {
    router.push({
      pathname: "/list/[listId]",
      params: {
        listId,
        name,
        seen: isSeen ? "1" : "0",
        systemKey: systemKey ?? "",
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Profile</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lists</Text>
            <Pressable
              style={styles.iconButton}
              onPress={() => setIsShowingCreateInput((prev) => !prev)}
            >
              <IconSymbol size={18} name={isShowingCreateInput ? "xmark" : "plus"} color="#111" />
            </Pressable>
          </View>

          {isShowingCreateInput && (
            <View style={styles.inlineCreateRow}>
              <TextInput
                value={newListName}
                onChangeText={setNewListName}
                style={styles.inlineInput}
                placeholder="List name"
                autoCapitalize="words"
                ref={inputRef}
              />
              <Pressable
                onPress={handleCreateCustomList}
                style={[
                  styles.inlineCreateButton,
                  (isCreatingList || !newListName.trim()) && styles.disabledButton,
                ]}
                disabled={isCreatingList || !newListName.trim()}
              >
                <IconSymbol size={16} name="checkmark" color="#fff" />
              </Pressable>
            </View>
          )}

          {profileLists === undefined ? (
            <ActivityIndicator size="small" color="#888" />
          ) : (
            <>
              {visibleLists.map((list) => {
                const isSeen = list._id === "seen";
                const isPendingVisibility =
                  !isSeen && pendingVisibilityIds.has(list._id as Id<"userLists">);

                return (
                  <Pressable
                    key={list._id}
                    style={styles.listRow}
                    onPress={() =>
                      openList(String(list._id), list.name, isSeen, list.systemKey)
                    }
                  >
                    <View style={styles.rowTop}>
                      <View style={styles.listInfo}>
                        <Text style={styles.listName}>{list.name}</Text>
                        <Text style={styles.listMeta}>{list.showCount} shows</Text>
                      </View>
                      {!isSeen ? (
                        <Pressable
                          style={styles.iconButton}
                          onPress={() =>
                            handleToggleVisibility(list._id as Id<"userLists">, list.isPublic)
                          }
                          disabled={isPendingVisibility}
                        >
                          {isPendingVisibility ? (
                            <Text style={styles.pendingText}>...</Text>
                          ) : (
                            <IconSymbol
                              size={16}
                              name={list.isPublic ? "globe" : "lock.fill"}
                              color="#111"
                            />
                          )}
                        </Pressable>
                      ) : (
                        <View style={styles.iconButton}>
                          <IconSymbol size={16} name="lock.fill" color="#111" />
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        <View style={styles.info}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.email}>{session?.user?.email ?? "Unknown"}</Text>
          {session?.user?.name && <Text style={styles.name}>{session.user.name}</Text>}
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  info: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  label: {
    fontSize: 12,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
  },
  name: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e2e2",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    backgroundColor: "#fbfbfb",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1f1f",
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d3d3d3",
    backgroundColor: "#fff",
  },
  inlineCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  inlineCreateButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
  },
  listRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  listName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f1f1f",
  },
  listMeta: {
    fontSize: 12,
    color: "#767676",
  },
  listInfo: {
    flex: 1,
    gap: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },
  errorText: {
    color: "#cc2a2a",
    fontSize: 13,
    lineHeight: 18,
  },
  signOutButton: {
    padding: 14,
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    alignItems: "center",
  },
  signOutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

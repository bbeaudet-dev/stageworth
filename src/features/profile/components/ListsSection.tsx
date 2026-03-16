import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import type { RefObject } from "react";

import type { Id } from "@/convex/_generated/dataModel";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { styles } from "@/features/profile/styles";
import type { VisibleProfileList } from "@/features/profile/types";

export function ListsSection({
  isShowingCreateInput,
  setIsShowingCreateInput,
  newListName,
  setNewListName,
  isCreatingList,
  onCreateCustomList,
  inputRef,
  profileListsLoading,
  visibleLists,
  pendingVisibilityIds,
  onToggleVisibility,
  openList,
  errorMessage,
}: {
  isShowingCreateInput: boolean;
  setIsShowingCreateInput: (value: boolean) => void;
  newListName: string;
  setNewListName: (value: string) => void;
  isCreatingList: boolean;
  onCreateCustomList: () => void;
  inputRef: RefObject<TextInput | null>;
  profileListsLoading: boolean;
  visibleLists: VisibleProfileList[];
  pendingVisibilityIds: Set<string>;
  onToggleVisibility: (listId: Id<"userLists">, isPublic: boolean) => void;
  openList: (list: VisibleProfileList) => void;
  errorMessage: string | null;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lists</Text>
        <Pressable
          style={styles.iconButton}
          onPress={() => setIsShowingCreateInput(!isShowingCreateInput)}
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
            onPress={onCreateCustomList}
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

      {profileListsLoading ? (
        <ActivityIndicator size="small" color="#888" />
      ) : (
        <>
          {visibleLists.map((list) => {
            const isSeen = list._id === "seen";
            const idKey = String(list._id);
            const isPendingVisibility = !isSeen && pendingVisibilityIds.has(idKey);
            return (
              <Pressable key={idKey} style={styles.listRow} onPress={() => openList(list)}>
                <View style={styles.rowTop}>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{list.name}</Text>
                    <Text style={styles.listMeta}>{list.showCount} shows</Text>
                  </View>
                  {!isSeen ? (
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => onToggleVisibility(list._id as Id<"userLists">, list.isPublic)}
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
  );
}

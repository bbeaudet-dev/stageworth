import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import type { RefObject } from "react";

import type { Id } from "@/convex/_generated/dataModel";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { styles } from "@/features/profile/styles";
import type { VisibleProfileList } from "@/features/profile/types";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

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
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const chipBackground = Colors[theme].surface;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;

  return (
    <View style={[styles.section, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Lists</Text>
        <Pressable
          style={[styles.iconButton, { backgroundColor: chipBackground, borderColor }]}
          onPress={() => setIsShowingCreateInput(!isShowingCreateInput)}
        >
          <IconSymbol
            size={18}
            name={isShowingCreateInput ? "xmark" : "plus"}
            color={primaryTextColor}
          />
        </Pressable>
      </View>

      {isShowingCreateInput && (
        <View style={styles.inlineCreateRow}>
          <TextInput
            value={newListName}
            onChangeText={setNewListName}
            style={[
              styles.inlineInput,
              { backgroundColor: chipBackground, borderColor, color: primaryTextColor },
            ]}
            placeholder="List name"
            autoCapitalize="words"
            ref={inputRef}
          />
          <Pressable
            onPress={onCreateCustomList}
            style={[
              styles.inlineCreateButton,
              (isCreatingList || !newListName.trim()) && styles.disabledButton,
              { backgroundColor: accentColor },
            ]}
            disabled={isCreatingList || !newListName.trim()}
          >
            <IconSymbol size={16} name="checkmark" color={onAccent} />
          </Pressable>
        </View>
      )}

      {profileListsLoading ? (
        <ActivityIndicator size="small" color={mutedTextColor} />
      ) : (
        <>
          {visibleLists.map((list) => {
            const isSeen = list._id === "seen";
            const idKey = String(list._id);
            const isPendingVisibility = !isSeen && pendingVisibilityIds.has(idKey);
            return (
              <Pressable
                key={idKey}
                style={[styles.listRow, { backgroundColor: chipBackground, borderColor }]}
                onPress={() => openList(list)}
              >
                <View style={styles.rowTop}>
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: primaryTextColor }]}>
                      {list.name}
                    </Text>
                    <Text style={[styles.listMeta, { color: mutedTextColor }]}>
                      {list.showCount} shows
                    </Text>
                  </View>
                  {!isSeen ? (
                    <Pressable
                      style={[styles.iconButton, { backgroundColor: chipBackground, borderColor }]}
                      onPress={() => onToggleVisibility(list._id as Id<"userLists">, list.isPublic)}
                      disabled={isPendingVisibility}
                    >
                      {isPendingVisibility ? (
                        <Text style={[styles.pendingText, { color: mutedTextColor }]}>...</Text>
                      ) : (
                        <IconSymbol
                          size={16}
                          name={list.isPublic ? "globe" : "lock.fill"}
                            color={primaryTextColor}
                        />
                      )}
                    </Pressable>
                  ) : (
                    <View style={[styles.iconButton, { backgroundColor: chipBackground, borderColor }]}>
                      <IconSymbol size={16} name="lock.fill" color={primaryTextColor} />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </>
      )}
      {errorMessage ? (
        <Text style={[styles.errorText, { color: Colors[theme].danger }]}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

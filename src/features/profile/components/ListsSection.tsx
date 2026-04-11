import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { Id } from "@/convex/_generated/dataModel";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { styles } from "@/features/profile/styles";
import type { VisibleProfileList } from "@/features/profile/types";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function ListsSection({
  onOpenCreateList,
  profileListsLoading,
  visibleLists,
  pendingVisibilityIds,
  onToggleVisibility,
  openList,
}: {
  onOpenCreateList: () => void;
  profileListsLoading: boolean;
  visibleLists: VisibleProfileList[];
  pendingVisibilityIds: Set<string>;
  onToggleVisibility: (listId: Id<"userLists">, isPublic: boolean) => void;
  openList: (list: VisibleProfileList) => void;
}) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const chipBackground = Colors[theme].surface;
  const accentColor = Colors[theme].accent;

  return (
    <View style={[styles.section, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Lists</Text>
        <Pressable
          style={[styles.iconButton, { backgroundColor: accentColor + "18", borderColor: accentColor + "55" }]}
          onPress={onOpenCreateList}
        >
          <IconSymbol size={18} name="plus" color={accentColor} />
        </Pressable>
      </View>

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
    </View>
  );
}

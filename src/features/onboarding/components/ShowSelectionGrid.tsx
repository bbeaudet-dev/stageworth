import { StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import type { Id } from "@/convex/_generated/dataModel";
import { ShowCard } from "@/features/browse/components/ShowCard";
import { styles as browseStyles } from "@/features/browse/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { chunkRows } from "@/utils/arrays";

export type ShowSelectionItem = {
  _id: Id<"shows">;
  name: string;
  type?: string;
  images: string[];
};

const GRID_COLUMNS = 4;

export function ShowSelectionGrid({
  items,
  selected,
  onToggle,
}: {
  items: ShowSelectionItem[];
  selected: Set<string>;
  onToggle: (showId: Id<"shows">) => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  return (
    <View>
      {chunkRows(items, GRID_COLUMNS).map((row, rowIdx) => (
        <View key={rowIdx} style={browseStyles.gridRow}>
          {row.map((item) => {
            const isSelected = selected.has(String(item._id));
            return (
              <View key={item._id} style={styles.cell}>
                <ShowCard
                  show={{
                    name: item.name,
                    type: item.type,
                    images: item.images,
                  }}
                  onPress={() => onToggle(item._id)}
                  containerStyle={
                    isSelected
                      ? { borderColor: c.accent, borderWidth: 2 }
                      : undefined
                  }
                />
                {isSelected ? (
                  <>
                    <View
                      style={[
                        styles.tintOverlay,
                        { backgroundColor: c.accent + "55" },
                      ]}
                      pointerEvents="none"
                    />
                    <View
                      style={[styles.checkBadge, { backgroundColor: c.accent }]}
                      pointerEvents="none"
                    >
                      <IconSymbol
                        name="checkmark"
                        size={14}
                        color={c.onAccent}
                      />
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}
          {row.length < GRID_COLUMNS &&
            Array.from({ length: GRID_COLUMNS - row.length }).map((_, i) => (
              <View key={`pad-${i}`} style={browseStyles.gridPlaceholder} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});

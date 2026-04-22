import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { styles as sharedStyles } from "@/features/add-visit/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInitials, getDisplayName } from "@/utils/user";
import type { Id } from "@/convex/_generated/dataModel";

const MAX_GUEST_NAME_LENGTH = 40;

type FollowingUser = {
  _id: Id<"users">;
  username: string;
  name?: string | null;
  avatarUrl: string | null;
};

type Props = {
  following: FollowingUser[];
  taggedUserIds: Id<"users">[];
  onToggle: (userId: Id<"users">) => void;
  guestNames: string[];
  onAddGuest: (name: string) => void;
  onRemoveGuest: (name: string) => void;
};

export function TagFriendsSection({
  following,
  taggedUserIds,
  onToggle,
  guestNames,
  onAddGuest,
  onRemoveGuest,
}: Props) {
  const theme = useColorScheme() ?? "light";
  const text = Colors[theme].text;
  const mutedText = theme === "dark" ? "#a0a4aa" : "#666";
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const chipBg = theme === "dark" ? "#27272f" : "#f2f2f7";
  const chipBgSelected = accentColor;
  const chipBorder = theme === "dark" ? "#3a3a44" : "#e0e0e0";
  const avatarFallbackBg = theme === "dark" ? "#3a3a50" : "#d4d4f0";
  const surface = Colors[theme].surface;
  const border = Colors[theme].border;

  const [isAddingOther, setIsAddingOther] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (isAddingOther) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isAddingOther]);

  const trimmed = draft.trim();
  const alreadyExists = guestNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase()
  );
  const canSave = trimmed.length > 0 && !alreadyExists;

  const commit = () => {
    if (!canSave) return;
    onAddGuest(trimmed);
    setDraft("");
    setIsAddingOther(false);
  };

  const cancel = () => {
    setDraft("");
    setIsAddingOther(false);
  };

  const hasAnyChips = following.length > 0 || guestNames.length > 0;

  return (
    <View style={styles.section}>
      <Text style={[sharedStyles.sectionTitle, { color: text }]}>Tag friends</Text>

      {!hasAnyChips ? (
        <Text style={[styles.emptyText, { color: mutedText }]}>
          Follow people to tag them, or add someone by name.
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {following.map((user) => {
          const isSelected = taggedUserIds.includes(user._id);
          return (
            <Pressable
              key={user._id}
              onPress={() => onToggle(user._id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? chipBgSelected : chipBg,
                  borderColor: isSelected ? chipBgSelected : chipBorder,
                },
              ]}
            >
              <View style={styles.chipInner}>
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={[styles.avatar, isSelected && styles.avatarSelected]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarFallback,
                      {
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.25)"
                          : avatarFallbackBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarFallbackText,
                        { color: isSelected ? onAccent : accentColor },
                      ]}
                    >
                      {getInitials(user.name, user.username)}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.chipName,
                    { color: isSelected ? onAccent : text },
                  ]}
                  numberOfLines={1}
                >
                  {getDisplayName(user.name, user.username)}
                </Text>
                {isSelected ? (
                  <Text style={[styles.checkmark, { color: onAccent }]}>✓</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {guestNames.map((name) => (
          <Pressable
            key={`guest-${name}`}
            onPress={() => onRemoveGuest(name)}
            style={[
              styles.chip,
              { backgroundColor: chipBgSelected, borderColor: chipBgSelected },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${name}`}
          >
            <View style={styles.chipInner}>
              <Text
                style={[styles.chipName, { color: onAccent }]}
                numberOfLines={1}
              >
                {name}
              </Text>
              <Text style={[styles.removeMark, { color: onAccent }]}>×</Text>
            </View>
          </Pressable>
        ))}

        <Pressable
          onPress={() => setIsAddingOther(true)}
          style={[
            styles.chip,
            styles.otherChip,
            {
              backgroundColor: isAddingOther ? chipBgSelected : chipBg,
              borderColor: isAddingOther ? chipBgSelected : chipBorder,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Tag someone not on the app"
        >
          <Text
            style={[
              styles.chipName,
              { color: isAddingOther ? onAccent : mutedText },
            ]}
          >
            + Other
          </Text>
        </Pressable>
      </ScrollView>

      {isAddingOther ? (
        <View style={styles.otherForm}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder="Name (e.g. mom)"
            placeholderTextColor={mutedText}
            style={[
              styles.input,
              { backgroundColor: surface, borderColor: border, color: text },
            ]}
            maxLength={MAX_GUEST_NAME_LENGTH}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={commit}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={cancel}
            style={[
              styles.otherButton,
              { backgroundColor: chipBg, borderColor: chipBorder },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.otherButtonText, { color: mutedText }]}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={commit}
            disabled={!canSave}
            style={[
              styles.otherButton,
              {
                backgroundColor: canSave ? accentColor : chipBg,
                borderColor: canSave ? accentColor : chipBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save tagged guest"
          >
            <Text
              style={[
                styles.otherButtonText,
                { color: canSave ? onAccent : mutedText },
              ]}
            >
              Save
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    paddingTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
  },
  scrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: "center",
  },
  otherChip: {
    paddingHorizontal: 14,
  },
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarSelected: {
    opacity: 0.9,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 9,
    fontWeight: "700",
  },
  chipName: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 120,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: "700",
  },
  removeMark: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 16,
  },
  otherForm: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  otherButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  otherButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

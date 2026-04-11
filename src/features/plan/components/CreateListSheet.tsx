import { useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/bottom-sheet";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface CreateListSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (args: { name: string; description?: string }) => Promise<void>;
}

export function CreateListSheet({ visible, onClose, onCreate }: CreateListSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const backgroundColor = Colors[theme].background;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const inputBg = Colors[theme].surface;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const descRef = useRef<TextInput>(null);

  const canSubmit = name.trim().length > 0;

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleClose = () => {
    if (name.trim() !== "") {
      Alert.alert(
        "Discard List?",
        "Your list info will not be saved.",
        [
          { text: "Keep Editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: () => { resetForm(); onClose(); } },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  const handleCreate = async () => {
    if (!canSubmit || isSubmitting) return;
    Keyboard.dismiss();
    setIsSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      resetForm();
      onClose();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={[styles.sheet, { backgroundColor, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text style={[styles.title, { color: primaryTextColor }]}>New List</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={[styles.cancelText, { color: accentColor }]}>Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <TextInput
            style={[styles.nameInput, { backgroundColor: inputBg, borderColor, color: primaryTextColor }]}
            value={name}
            onChangeText={setName}
            placeholder="List name"
            placeholderTextColor={mutedTextColor}
            autoCapitalize="words"
            returnKeyType="next"
            maxLength={100}
            autoFocus
            onSubmitEditing={() => descRef.current?.focus()}
          />

          <TextInput
            ref={descRef}
            style={[styles.descInput, { backgroundColor: inputBg, borderColor, color: primaryTextColor }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={mutedTextColor}
            autoCapitalize="sentences"
            returnKeyType="done"
            maxLength={300}
            multiline
            onSubmitEditing={Keyboard.dismiss}
          />

          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: accentColor },
              (!canSubmit || isSubmitting) && styles.saveButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!canSubmit || isSubmitting}
          >
            <Text style={[styles.saveButtonText, { color: onAccent }]}>
              {isSubmitting ? "Creating…" : "Create List"}
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  body: {
    padding: 16,
    gap: 14,
  },
  nameInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: "500",
  },
  descInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 2,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

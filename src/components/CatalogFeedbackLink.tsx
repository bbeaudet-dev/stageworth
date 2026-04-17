/**
 * Self-contained "suggest a correction / missing show" link + bottom sheet.
 * Handles auth checking, Convex mutation, and all UI state internally so it can
 * be dropped in anywhere without threading callbacks through parent components.
 */
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/lib/auth-client";

interface CatalogFeedbackLinkProps {
  /** Where this link appears — stored on the feedback record for admin triage. */
  source: "show_detail" | "search" | "add_visit";
  /** When provided the feedback is linked to a specific show. Omit for "missing show" reports. */
  showId?: Id<"shows">;
  /** Visible text for the pressable link. */
  linkText?: string;
  /** Sheet title. */
  title?: string;
  /** Explanatory sub-text shown under the title. */
  hint?: string;
  /** Placeholder text for the note field. */
  placeholder?: string;
  /** Disables the link (e.g. while show data is still loading). */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CatalogFeedbackLink({
  source,
  showId,
  linkText = "Something missing? Let us know",
  title = "Suggest a correction",
  hint = "Tell us what should be added or fixed. A moderator will review it.",
  placeholder = "What should we change?",
  disabled,
  style,
}: CatalogFeedbackLinkProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const insets = useSafeAreaInsets();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = useMutation(api.admin.catalogUserFeedback.submit);

  function handleLinkPress() {
    if (!session) {
      Alert.alert("Sign in required", "Sign in to submit feedback.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => router.push("/sign-in") },
      ]);
      return;
    }
    setNote("");
    setSheetOpen(true);
  }

  async function handleSubmit() {
    if (submitting) return;
    const trimmed = note.trim();
    if (trimmed.length < 3) {
      Alert.alert("Add more detail", "Please write at least a few characters.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ showId, note: trimmed, source });
      setSheetOpen(false);
      setNote("");
      Alert.alert("Thanks!", "We've received your note and will review it.");
    } catch (e) {
      Alert.alert("Something went wrong", e instanceof Error ? e.message : "Could not send feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={handleLinkPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.linkWrap,
          style,
          { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.linkText, { color: c.mutedText }]}>{linkText}</Text>
      </Pressable>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !submitting && setSheetOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => !submitting && setSheetOpen(false)}
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.background, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <Text style={[styles.sheetTitle, { color: c.text }]}>{title}</Text>
          <Text style={[styles.sheetHint, { color: c.mutedText }]}>{hint}</Text>
          <Text style={[styles.fieldLabel, { color: c.mutedText }]}>Your note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={placeholder}
            placeholderTextColor={c.mutedText}
            multiline
            editable={!submitting}
            style={[
              styles.input,
              { color: c.text, borderColor: c.border, backgroundColor: c.surfaceElevated },
            ]}
            textAlignVertical="top"
          />
          <View style={styles.actions}>
            <Pressable
              onPress={() => !submitting && setSheetOpen(false)}
              style={[styles.cancelBtn, { borderColor: c.border }]}
            >
              <Text style={{ color: c.text, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || note.trim().length < 3}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: c.accent,
                  opacity: submitting || note.trim().length < 3 ? 0.45 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={c.onAccent} />
              ) : (
                <Text style={[styles.sendBtnText, { color: c.onAccent }]}>Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  linkWrap: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12 },
  linkText: { fontSize: 13, fontWeight: "500", textDecorationLine: "underline" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    maxHeight: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", paddingHorizontal: 18, marginBottom: 6 },
  sheetHint: { fontSize: 13, lineHeight: 18, paddingHorizontal: 18, marginBottom: 12 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  input: {
    marginHorizontal: 18,
    minHeight: 100,
    maxHeight: 160,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 22,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { fontWeight: "700", fontSize: 15 },
});

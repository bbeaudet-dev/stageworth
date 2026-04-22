/**
 * Shared report sheet for users and feed posts.
 *
 * Renders a reason radio list + optional details field and calls the
 * appropriate Convex mutation. The success toast wording ("Our team will
 * review within 24 hours") mirrors the timeline Apple 1.2 expects UGC apps
 * to commit to.
 */
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "sexual"
  | "violence"
  | "self_harm"
  | "impersonation"
  | "other";

const REASONS: { id: ReportReason; label: string; sub: string }[] = [
  { id: "spam", label: "Spam", sub: "Repetitive, commercial, or misleading content" },
  { id: "harassment", label: "Harassment or bullying", sub: "Targeted insults or threats" },
  { id: "hate", label: "Hate speech", sub: "Attacks based on identity or protected class" },
  { id: "sexual", label: "Sexual content", sub: "Nudity or sexually explicit material" },
  { id: "violence", label: "Violence or gore", sub: "Graphic or threatening violence" },
  { id: "self_harm", label: "Self-harm", sub: "Encourages self-injury or suicide" },
  { id: "impersonation", label: "Impersonation", sub: "Pretending to be someone else" },
  { id: "other", label: "Something else", sub: "Tell us what's wrong" },
];

const MAX_DETAILS = 1000;

export type ReportTarget =
  | { kind: "user"; userId: Id<"users">; label?: string }
  | { kind: "activityPost"; postId: Id<"activityPosts">; label?: string }
  | { kind: "visit"; visitId: Id<"visits">; label?: string };

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  target: ReportTarget;
}

export function ReportSheet({ visible, onClose, target }: ReportSheetProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const insets = useSafeAreaInsets();

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reportUser = useMutation(api.social.safety.reportUser);
  const reportPost = useMutation(api.social.safety.reportActivityPost);
  const reportVisit = useMutation(api.social.safety.reportVisit);

  function handleClose() {
    if (submitting) return;
    setReason(null);
    setDetails("");
    onClose();
  }

  async function handleSubmit() {
    if (!reason || submitting) return;
    const trimmed = details.trim().slice(0, MAX_DETAILS);

    setSubmitting(true);
    try {
      if (target.kind === "user") {
        await reportUser({
          targetUserId: target.userId,
          reason,
          details: trimmed.length > 0 ? trimmed : undefined,
        });
      } else if (target.kind === "activityPost") {
        await reportPost({
          postId: target.postId,
          reason,
          details: trimmed.length > 0 ? trimmed : undefined,
        });
      } else {
        await reportVisit({
          visitId: target.visitId,
          reason,
          details: trimmed.length > 0 ? trimmed : undefined,
        });
      }
      setReason(null);
      setDetails("");
      onClose();
      Alert.alert(
        "Report submitted",
        "Thanks — our team will review within 24 hours and take action if needed."
      );
    } catch (e) {
      Alert.alert(
        "Could not submit",
        e instanceof Error ? e.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const titleByKind: Record<ReportTarget["kind"], string> = {
    user: "Report user",
    activityPost: "Report post",
    visit: "Report visit",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.background, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <Text style={[styles.title, { color: c.text }]}>
          {titleByKind[target.kind]}
        </Text>
        <Text style={[styles.hint, { color: c.mutedText }]}>
          Your report is anonymous to the reported user. Our team reviews reports
          within 24 hours.
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {REASONS.map((r) => {
            const selected = reason === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => setReason(r.id)}
                style={({ pressed }) => [
                  styles.reasonRow,
                  {
                    borderColor: selected ? c.accent : c.border,
                    backgroundColor: selected ? c.surface : c.surfaceElevated,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected ? c.accent : c.border,
                      backgroundColor: selected ? c.accent : "transparent",
                    },
                  ]}
                />
                <View style={styles.reasonText}>
                  <Text style={[styles.reasonLabel, { color: c.text }]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.reasonSub, { color: c.mutedText }]}>
                    {r.sub}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <Text style={[styles.fieldLabel, { color: c.mutedText }]}>
            Additional details (optional)
          </Text>
          <TextInput
            value={details}
            onChangeText={(v) => setDetails(v.slice(0, MAX_DETAILS))}
            placeholder="Share any context that will help us review this report."
            placeholderTextColor={c.mutedText}
            multiline
            editable={!submitting}
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: c.border,
                backgroundColor: c.surfaceElevated,
              },
            ]}
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            onPress={handleClose}
            disabled={submitting}
            style={[styles.cancelBtn, { borderColor: c.border }]}
          >
            <Text style={{ color: c.text, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !reason}
            style={[
              styles.sendBtn,
              {
                backgroundColor: c.accent,
                opacity: submitting || !reason ? 0.45 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={c.onAccent} />
            ) : (
              <Text style={[styles.sendBtnText, { color: c.onAccent }]}>
                Submit report
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    maxHeight: "90%",
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
  title: { fontSize: 17, fontWeight: "700", paddingHorizontal: 18, marginBottom: 6 },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  scroll: { maxHeight: 420 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 12 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  reasonText: { flex: 1 },
  reasonLabel: { fontSize: 15, fontWeight: "600" },
  reasonSub: { fontSize: 12, marginTop: 2 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    minHeight: 90,
    maxHeight: 140,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
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
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { fontWeight: "700", fontSize: 15 },
});

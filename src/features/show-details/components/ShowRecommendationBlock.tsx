import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAction } from "convex/react";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";

type RecOk = {
  kind: "ok";
  score: number;
  headline: string;
  reasoning: string;
  matchedElements: string[];
  mismatchedElements: string[];
};

type RecInsufficient = {
  kind: "insufficient_context";
  reason: string;
};

type RecResult = RecOk | RecInsufficient;

interface ShowRecommendationBlockProps {
  showId: Id<"shows"> | "";
  showName?: string;
  isSignedIn: boolean;
}

export function ShowRecommendationBlock({ showId, showName, isSignedIn }: ShowRecommendationBlockProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";

  const getRecommendation = useAction(api.recommendations.getShowRecommendation);

  const [recLoading, setRecLoading] = useState(false);
  const [recResult, setRecResult] = useState<RecResult | null>(null);
  const [recError, setRecError] = useState(false);

  async function handleGetRecommendation() {
    if (!showId || recLoading) return;
    if (!isSignedIn) {
      Alert.alert("Sign in required", "Sign in to get personalized recommendations.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign in", onPress: () => router.push("/sign-in") },
      ]);
      return;
    }
    setRecLoading(true);
    setRecError(false);
    try {
      const result = await getRecommendation({ showId: showId as Id<"shows"> });
      setRecResult(result);
    } catch {
      setRecError(true);
    } finally {
      setRecLoading(false);
    }
  }

  const resetState = () => {
    setRecResult(null);
    setRecError(false);
  };

  if (!recResult) {
    return (
      <Pressable
        onPress={handleGetRecommendation}
        disabled={recLoading || !showName}
        style={[
          styles.recButton,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F8F4FF",
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E8E0F0",
            opacity: recLoading || !showName ? 0.6 : 1,
          },
        ]}
      >
        {recLoading ? (
          <View style={styles.recLoadingRow}>
            <ActivityIndicator size="small" color={c.mutedText} />
            <Text style={[styles.recLoadingText, { color: c.mutedText }]}>Analyzing your taste…</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.recButtonTitle, { color: c.text }]}>Would I like this?</Text>
            <Text style={[styles.recButtonSub, { color: c.mutedText }]}>
              Get a personalized recommendation based on your preferences
            </Text>
          </>
        )}
        {recError && (
          <Text style={[styles.recErrorText, { color: c.danger }]}>
            Something went wrong. Tap to try again.
          </Text>
        )}
      </Pressable>
    );
  }

  if (recResult.kind === "insufficient_context") {
    return (
      <View
        style={[
          styles.recResultCard,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FAFAFA",
            borderColor: c.border,
          },
        ]}
      >
        <Text style={[styles.recHeadline, { color: c.text }]}>
          Not enough to go on yet
        </Text>
        <Text style={[styles.recReasoning, { color: c.mutedText }]}>
          We couldn&apos;t generate a reliable suggestion for this show yet
          {recResult.reason ? ` — ${recResult.reason.trim().replace(/\.$/, "")}.` : "."}
          {" "}Try again later, or add more ranked shows so we have more to
          compare against.
        </Text>
        <Pressable
          onPress={resetState}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            alignSelf: "flex-start",
            marginTop: 4,
          })}
        >
          <Text style={[styles.recRetryText, { color: c.accent }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.recResultCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
      <View style={styles.recResultHeader}>
        <Text style={[styles.recScoreBubble, { color: c.text }]}>{recResult.score}/5</Text>
        <Text style={[styles.recHeadline, { color: c.text }]}>{recResult.headline}</Text>
      </View>
      <Text style={[styles.recReasoning, { color: c.mutedText }]}>{recResult.reasoning}</Text>
      {recResult.matchedElements.length > 0 && (
        <View style={styles.recChipRow}>
          {recResult.matchedElements.map((el) => (
            <View
              key={el}
              style={[styles.recChip, { backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5", borderColor: isDark ? "rgba(16,185,129,0.3)" : "#A7F3D0" }]}
            >
              <Text style={[styles.recChipText, { color: isDark ? "#6EE7B7" : "#065F46" }]}>{el}</Text>
            </View>
          ))}
        </View>
      )}
      {recResult.mismatchedElements.length > 0 && (
        <View style={styles.recChipRow}>
          {recResult.mismatchedElements.map((el) => (
            <View
              key={el}
              style={[styles.recChip, { backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2", borderColor: isDark ? "rgba(239,68,68,0.25)" : "#FECACA" }]}
            >
              <Text style={[styles.recChipText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>{el}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        onPress={resetState}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: "flex-start", marginTop: 4 })}
      >
        <Text style={[styles.recRetryText, { color: c.accent }]}>Ask again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recButton: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 4 },
  recButtonTitle: { fontSize: 16, fontWeight: "700" },
  recButtonSub: { fontSize: 13, lineHeight: 18 },
  recLoadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  recLoadingText: { fontSize: 14, fontWeight: "500" },
  recErrorText: { fontSize: 13, marginTop: 6 },
  recResultCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  recResultHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  recScoreBubble: { fontSize: 20, fontWeight: "800" },
  recHeadline: { fontSize: 16, fontWeight: "700", flex: 1 },
  recReasoning: { fontSize: 14, lineHeight: 20 },
  recChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  recChip: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 5 },
  recChipText: { fontSize: 12, fontWeight: "600" },
  recRetryText: { fontSize: 13, fontWeight: "600" },
});

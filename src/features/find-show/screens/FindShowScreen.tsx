import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDate } from "@/utils/dates";

import { FindShowDatePicker } from "@/features/find-show/components/FindShowDatePicker";
import { FindShowPickCard } from "@/features/find-show/components/FindShowPickCard";
import { useFindShow } from "@/features/find-show/hooks/useFindShow";

export default function FindShowScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const [targetDate, setTargetDate] = useState<string | null>(null);
  const { loading, result, error, run, reset } = useFindShow();

  const ctaLabel = useMemo(() => {
    if (targetDate) {
      return `Find something for ${formatDate(targetDate) ?? "that day"}`;
    }
    return "Find a show for me";
  }, [targetDate]);

  const handleRun = () => {
    void run({ targetDate: targetDate ?? undefined });
  };

  const handlePickPress = (showId: string) => {
    router.push({ pathname: "/show/[showId]", params: { showId } });
  };

  const handleReset = () => {
    reset();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <IconSymbol name="chevron.left" size={22} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>Find a Show</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBlock}>
          <Text style={[styles.introTitle, { color: c.text }]}>
            Let&apos;s pick something you&apos;ll love
          </Text>
          <Text style={[styles.introSub, { color: c.mutedText }]}>
            We&apos;ll match currently-running productions to your taste.
            Optionally pick a date and we&apos;ll only suggest shows that are
            playing that day.
          </Text>
        </View>

        <FindShowDatePicker date={targetDate} onChangeDate={setTargetDate} />

        <Pressable
          onPress={handleRun}
          disabled={loading}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: c.accent,
              opacity: loading ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {loading ? (
            <View style={styles.ctaLoadingRow}>
              <ActivityIndicator size="small" color={c.onAccent} />
              <Text style={[styles.ctaText, { color: c.onAccent }]}>
                Looking for a match…
              </Text>
            </View>
          ) : (
            <Text style={[styles.ctaText, { color: c.onAccent }]}>{ctaLabel}</Text>
          )}
        </Pressable>

        {error && (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: c.surfaceElevated,
                borderColor: c.border,
              },
            ]}
          >
            <Text style={[styles.errorTitle, { color: c.text }]}>
              Couldn&apos;t get a suggestion
            </Text>
            <Text style={[styles.errorSub, { color: c.mutedText }]}>{error}</Text>
          </View>
        )}

        {result?.kind === "insufficient_context" && (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: c.surfaceElevated,
                borderColor: c.border,
              },
            ]}
          >
            <Text style={[styles.errorTitle, { color: c.text }]}>
              No strong match right now
            </Text>
            <Text style={[styles.errorSub, { color: c.mutedText }]}>
              {result.reason.trim().replace(/\.$/, "")}.
              {result.hasTargetDate
                ? " Try widening the window to \"Any time\" or a different date."
                : " Adding more ranked shows will sharpen suggestions."}
            </Text>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                alignSelf: "flex-start",
                marginTop: 4,
              })}
            >
              <Text style={[styles.retryText, { color: c.accent }]}>
                Adjust and try again
              </Text>
            </Pressable>
          </View>
        )}

        {result?.kind === "ok" && (
          <View style={styles.results}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: c.text }]}>
                Top pick
              </Text>
              {result.hasTargetDate && (
                <Text style={[styles.resultsDate, { color: c.mutedText }]}>
                  for {formatDate(result.anchorDate)}
                </Text>
              )}
            </View>

            <FindShowPickCard
              pick={result.primary}
              variant="primary"
              onPress={() => handlePickPress(String(result.primary.showId))}
            />

            {result.alternates.length > 0 && (
              <>
                <Text
                  style={[
                    styles.alternatesTitle,
                    { color: c.mutedText },
                  ]}
                >
                  Also consider
                </Text>
                {result.alternates.map((alt) => (
                  <FindShowPickCard
                    key={String(alt.showId)}
                    pick={alt}
                    variant="alternate"
                    onPress={() => handlePickPress(String(alt.showId))}
                  />
                ))}
              </>
            )}

            <Pressable
              onPress={handleRun}
              disabled={loading}
              style={({ pressed }) => [
                styles.secondaryCta,
                {
                  borderColor: c.border,
                  opacity: loading ? 0.6 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol name="arrow.clockwise" size={14} color={c.accent} />
              <Text style={[styles.secondaryCtaText, { color: c.accent }]}>
                Suggest another
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  introBlock: { gap: 6, marginTop: 4 },
  introTitle: { fontSize: 22, fontWeight: "800" },
  introSub: { fontSize: 14, lineHeight: 20 },
  cta: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "700" },
  ctaLoadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  errorCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  errorTitle: { fontSize: 15, fontWeight: "700" },
  errorSub: { fontSize: 13, lineHeight: 18 },
  retryText: { fontSize: 13, fontWeight: "700" },
  results: { gap: 12 },
  resultsHeader: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  resultsTitle: { fontSize: 16, fontWeight: "800" },
  resultsDate: { fontSize: 13, fontWeight: "600" },
  alternatesTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 10,
  },
  secondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  secondaryCtaText: { fontSize: 14, fontWeight: "700" },
});

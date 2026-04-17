import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface TheatreChallengeProps {
  userId?: Id<"users">;
  isSelf?: boolean;
}

export function TheatreChallenge({ userId, isSelf = true }: TheatreChallengeProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const selfChallenge = useQuery(
    api.challenges.getMy,
    isSelf ? { year: currentYear } : "skip",
  );
  const otherChallenge = useQuery(
    api.challenges.getForUser,
    !isSelf && userId ? { userId, year: currentYear } : "skip",
  );

  const challenge = isSelf ? selfChallenge : otherChallenge;
  const createChallenge = useMutation(api.challenges.create);
  const deleteChallenge = useMutation(api.challenges.deleteChallenge);

  const [isSetup, setIsSetup] = useState(false);
  const [goalInput, setGoalInput] = useState("25");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const progressBg = theme === "dark" ? "#1e1e24" : "#f0f0f2";

  // Loading state
  if (challenge === undefined) {
    return (
      <View style={[styles.container, { backgroundColor: accentColor + "10", borderColor: accentColor + "55" }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: primaryTextColor }]}>
            {currentYear} Theatre Challenge
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: progressBg }]}>
          <View style={[styles.progressFill, { backgroundColor: accentColor + "44", width: "40%" }]} />
        </View>
        <Text style={[styles.daysLeft, { color: mutedTextColor }]}>Loading…</Text>
      </View>
    );
  }

  if (!isSelf && !challenge) return null;

  if (challenge) {
    const rawProgress = challenge.targetCount > 0
      ? challenge.currentCount / challenge.targetCount
      : 0;
    const barProgress = Math.min(rawProgress, 1);
    const displayPct = Math.round(rawProgress * 100);
    const isCompleted = challenge.currentCount >= challenge.targetCount;

    const now = new Date();
    const endOfYear = new Date(currentYear, 11, 31);
    const daysLeft = Math.max(
      0,
      Math.ceil((endOfYear.getTime() - now.getTime()) / 86400000)
    );

    // Wrap in a Pressable only for self — tapping the card navigates to the
    // challenges comparison screen. The inner ✕ Pressable captures its own
    // tap and prevents the outer press from firing.
    const CardWrapper = isSelf ? Pressable : View;
    const cardWrapperProps = isSelf
      ? { onPress: () => router.push("/challenges"), style: [styles.container, { backgroundColor: accentColor + "10", borderColor: accentColor + "55" }] as any }
      : { style: [styles.container, { backgroundColor: accentColor + "10", borderColor: accentColor + "55" }] as any };

    return (
      <CardWrapper {...cardWrapperProps}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: primaryTextColor }]}>
            {currentYear} Theatre Challenge
          </Text>
          {isSelf && (
            <Pressable
              onPress={() =>
                Alert.alert("Remove Challenge?", "This will delete your challenge.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => deleteChallenge({ year: currentYear }),
                  },
                ])
              }
              hitSlop={8}
            >
              <Text style={[styles.removeText, { color: mutedTextColor }]}>✕</Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.progressLabel, { color: primaryTextColor }]}>
          {challenge.currentCount} of {challenge.targetCount} shows
        </Text>

        <View style={[styles.progressBar, { backgroundColor: progressBg }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isCompleted ? (theme === "dark" ? "#5cb85c" : "#1a7a3a") : accentColor,
                width: `${Math.round(barProgress * 100)}%`,
              },
            ]}
          />
        </View>

        {isCompleted ? (
          <View style={[styles.completedBadge, { backgroundColor: theme === "dark" ? "#1a3a1a" : "#e6f7ee", borderColor: theme === "dark" ? "#3a6e3a" : "#7dcea0" }]}>
            <Text style={[styles.completedText, { color: theme === "dark" ? "#5cb85c" : "#1a7a3a" }]}>
              Challenge complete! {challenge.currentCount > challenge.targetCount
                ? `You went ${challenge.currentCount - challenge.targetCount} show${challenge.currentCount - challenge.targetCount === 1 ? "" : "s"} over your goal!`
                : "You did it — goal reached!"}
            </Text>
          </View>
        ) : (
          <Text style={[styles.daysLeft, { color: mutedTextColor }]}>
            {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            {" · "}
            {displayPct}% complete
          </Text>
        )}
      </CardWrapper>
    );
  }

  if (!isSelf) return null;

  if (isSetup) {
    return (
      <View style={[styles.container, { backgroundColor: accentColor + "10", borderColor: accentColor + "55" }]}>
        <Text style={[styles.title, { color: primaryTextColor }]}>
          {currentYear} Theatre Challenge
        </Text>
        <Text style={[styles.setupPrompt, { color: mutedTextColor }]}>
          How many shows do you want to see this year?
        </Text>
        <View style={styles.setupRow}>
          <TextInput
            style={[styles.goalInput, { color: primaryTextColor, borderColor }]}
            value={goalInput}
            onChangeText={setGoalInput}
            keyboardType="number-pad"
            maxLength={3}
            editable={!isSubmitting}
          />
          <Pressable
            style={[styles.startBtn, { backgroundColor: accentColor, opacity: isSubmitting ? 0.7 : 1 }]}
            disabled={isSubmitting}
            onPress={async () => {
              const target = parseInt(goalInput, 10);
              if (!target || target < 1) return;
              setIsSubmitting(true);
              try {
                await createChallenge({ year: currentYear, targetCount: target });
                setIsSetup(false);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={onAccent} />
            ) : (
              <Text style={[styles.startBtnText, { color: onAccent }]}>Start</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.cancelBtn, { borderColor }]}
            disabled={isSubmitting}
            onPress={() => setIsSetup(false)}
          >
            <Text style={[styles.cancelBtnText, { color: mutedTextColor }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.container, { backgroundColor: accentColor + "10", borderColor: accentColor + "55" }]}
      onPress={() => setIsSetup(true)}
    >
      <Text style={[styles.title, { color: primaryTextColor }]}>
        {currentYear} Theatre Challenge
      </Text>
      <Text style={[styles.setupPrompt, { color: mutedTextColor }]}>
        Set a goal for shows to see this year
      </Text>
      <View style={[styles.startChallenge, { backgroundColor: accentColor + "15" }]}>
        <Text style={[styles.startChallengeText, { color: accentColor }]}>
          Start Challenge
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  removeText: {
    fontSize: 16,
    fontWeight: "500",
    padding: 4,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  daysLeft: {
    fontSize: 12,
    fontWeight: "500",
  },
  completedBadge: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  completedText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  setupPrompt: {
    fontSize: 13,
    lineHeight: 18,
  },
  setupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalInput: {
    width: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  startBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cancelBtn: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  startChallenge: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  startChallengeText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
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

  const surfaceColor = Colors[theme].surfaceElevated;
  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const progressBg = theme === "dark" ? "#1e1e24" : "#f0f0f2";

  if (!isSelf && !challenge) return null;

  if (challenge) {
    const progress = challenge.targetCount > 0
      ? Math.min(challenge.currentCount / challenge.targetCount, 1)
      : 0;
    const now = new Date();
    const endOfYear = new Date(currentYear, 11, 31);
    const daysLeft = Math.max(
      0,
      Math.ceil((endOfYear.getTime() - now.getTime()) / 86400000)
    );

    return (
      <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
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
                backgroundColor: accentColor,
                width: `${Math.round(progress * 100)}%`,
              },
            ]}
          />
        </View>

        <Text style={[styles.daysLeft, { color: mutedTextColor }]}>
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
          {" · "}
          {Math.round(progress * 100)}% complete
        </Text>
      </View>
    );
  }

  if (!isSelf) return null;

  if (isSetup) {
    return (
      <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
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
          />
          <Pressable
            style={[styles.startBtn, { backgroundColor: accentColor }]}
            onPress={async () => {
              const target = parseInt(goalInput, 10);
              if (!target || target < 1) return;
              await createChallenge({ year: currentYear, targetCount: target });
              setIsSetup(false);
            }}
          >
            <Text style={[styles.startBtnText, { color: onAccent }]}>Start</Text>
          </Pressable>
          <Pressable
            style={[styles.cancelBtn, { borderColor }]}
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
      style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}
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

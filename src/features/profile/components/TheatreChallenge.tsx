import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Canvas, LinearGradient, RoundedRect, vec } from "@shopify/react-native-skia";
import type { GestureResponderEvent } from "react-native";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BRAND_BLUE, BRAND_PURPLE, Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";

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
  const yearSeenCount = useQuery(
    api.challenges.getMyYearSeenCount,
    isSelf ? { year: currentYear } : "skip"
  );
  const createChallenge = useMutation(api.challenges.create);
  const deleteChallenge = useMutation(api.challenges.deleteChallenge);

  const [setupMode, setSetupMode] = useState<"create" | "edit" | null>(null);
  const [goalInput, setGoalInput] = useState("15");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCardSize, setCompletedCardSize] = useState<{ width: number; height: number } | null>(null);
  const [completedProgressBarWidth, setCompletedProgressBarWidth] = useState(0);
  const shineAnim = useRef(new Animated.Value(0)).current;

  const borderColor = Colors[theme].border;
  const primaryTextColor = Colors[theme].text;
  const mutedTextColor = Colors[theme].mutedText;
  const accentColor = Colors[theme].accent;
  const onAccent = Colors[theme].onAccent;
  const progressBg = theme === "dark" ? "#1e1e24" : "#f0f0f2";
  const shouldAnimateShine =
    setupMode === null &&
    Boolean(challenge && challenge.currentCount >= challenge.targetCount && completedProgressBarWidth > 0);

  useEffect(() => {
    if (!shouldAnimateShine) {
      shineAnim.stopAnimation();
      shineAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 735,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1500),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      shineAnim.stopAnimation();
    };
  }, [shouldAnimateShine, shineAnim]);

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

  if (setupMode !== null) {
    return (
      <View style={[styles.container, { backgroundColor: accentColor + "10", borderColor: accentColor + "55" }]}>
        <Text style={[styles.title, { color: primaryTextColor }]}>
          {currentYear} Theatre Challenge
        </Text>
        <Text style={[styles.setupPrompt, { color: mutedTextColor }]}>
          How many shows do you want to see this year?
        </Text>
        <Text style={[styles.setupNote, { color: mutedTextColor }]}>
          Already seen this year: {yearSeenCount ?? 0} show{(yearSeenCount ?? 0) === 1 ? "" : "s"}
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
                setSetupMode(null);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={onAccent} />
            ) : (
              <Text style={[styles.startBtnText, { color: onAccent }]}>
                {setupMode === "edit" ? "Save" : "Start"}
              </Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.cancelBtn, { borderColor }]}
            disabled={isSubmitting}
            onPress={() => setSetupMode(null)}
          >
            <Text style={[styles.cancelBtnText, { color: mutedTextColor }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (challenge) {
    const rawProgress = challenge.targetCount > 0
      ? challenge.currentCount / challenge.targetCount
      : 0;
    const barProgress = Math.min(rawProgress, 1);
    const displayPct = Math.round(rawProgress * 100);
    const isCompleted = challenge.currentCount >= challenge.targetCount;
    const animatedShineTranslateX = shineAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-24, completedProgressBarWidth + 24],
    });

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
    const completedTextColor = isCompleted ? "#ffffff" : primaryTextColor;
    const completedMutedTextColor = isCompleted ? "rgba(255,255,255,0.85)" : mutedTextColor;
    const completedBorderColor = isCompleted ? "transparent" : accentColor + "55";
    const cardWrapperProps = isSelf
      ? {
          onPress: () => router.push("/challenges"),
          style: [styles.container, isCompleted ? styles.completedCardContainer : null, { backgroundColor: isCompleted ? "transparent" : accentColor + "10", borderColor: completedBorderColor }] as any,
          onLayout: (e: any) => {
            if (!isCompleted) return;
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) setCompletedCardSize({ width, height });
          },
        }
      : {
          style: [styles.container, isCompleted ? styles.completedCardContainer : null, { backgroundColor: isCompleted ? "transparent" : accentColor + "10", borderColor: completedBorderColor }] as any,
          onLayout: (e: any) => {
            if (!isCompleted) return;
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) setCompletedCardSize({ width, height });
          },
        };

    return (
      <CardWrapper {...cardWrapperProps}>
        {isCompleted && completedCardSize && (
          <Canvas style={[StyleSheet.absoluteFillObject, { borderRadius: styles.container.borderRadius }]} pointerEvents="none">
            <RoundedRect
              x={0}
              y={0}
              width={completedCardSize.width}
              height={completedCardSize.height}
              r={styles.container.borderRadius}
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(completedCardSize.width, completedCardSize.height)}
                colors={[BRAND_BLUE, BRAND_PURPLE]}
              />
            </RoundedRect>
          </Canvas>
        )}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: completedTextColor }]}>
            {currentYear} Theatre Challenge
          </Text>
          {isSelf && (
            <View style={styles.challengeActions}>
              <Pressable
                onPress={(e: GestureResponderEvent) => {
                  e.stopPropagation();
                  setGoalInput(String(challenge.targetCount));
                  setSetupMode("edit");
                }}
                hitSlop={8}
              >
                <IconSymbol name="pencil" size={16} color={completedMutedTextColor} />
              </Pressable>
              <Pressable
                onPress={(e: GestureResponderEvent) => {
                  e.stopPropagation();
                  Alert.alert("Remove Challenge?", "This will delete your challenge.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => deleteChallenge({ year: currentYear }),
                    },
                  ]);
                }}
                hitSlop={8}
              >
                <Text style={[styles.removeText, { color: completedMutedTextColor }]}>✕</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={[styles.progressLabel, { color: completedTextColor }]}>
          {challenge.currentCount} of {challenge.targetCount} shows
        </Text>

        <View
          style={[styles.progressBar, { backgroundColor: isCompleted ? "rgba(255,255,255,0.24)" : progressBg }]}
          onLayout={(e) => {
            if (!isCompleted) return;
            const width = e.nativeEvent.layout.width;
            if (width > 0 && width !== completedProgressBarWidth) {
              setCompletedProgressBarWidth(width);
            }
          }}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isCompleted ? "#f7f9ff" : accentColor,
                width: `${Math.round(barProgress * 100)}%`,
              },
            ]}
          >
            {isCompleted ? (
              <>
                <View style={styles.progressGloss} />
                <Animated.View
                  style={[
                    styles.progressShineAnimated,
                    {
                      transform: [
                        { translateX: animatedShineTranslateX },
                      ],
                    },
                  ]}
                />
              </>
            ) : null}
          </View>
        </View>

        {isCompleted ? (
          <Text style={styles.completedText}>
            Challenge complete! {challenge.currentCount > challenge.targetCount
              ? `You went ${challenge.currentCount - challenge.targetCount} show${challenge.currentCount - challenge.targetCount === 1 ? "" : "s"} over your goal!`
              : "You did it — goal reached!"}
          </Text>
        ) : (
          <Text style={[styles.daysLeft, { color: completedMutedTextColor }]}>
            {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            {" · "}
            {displayPct}% complete
          </Text>
        )}
      </CardWrapper>
    );
  }

  if (!isSelf) return null;

  return (
    <Pressable
      style={[styles.container, { backgroundColor: accentColor + "10", borderColor: accentColor + "55" }]}
      onPress={() => {
        setGoalInput("25");
        setSetupMode("create");
      }}
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
  completedCardContainer: {
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    overflow: "hidden",
  },
  progressGloss: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "48%",
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  progressShineAnimated: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 24,
    borderRadius: 8,
    backgroundColor: "rgba(83,109,254,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  daysLeft: {
    fontSize: 12,
    fontWeight: "500",
  },
  completedText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    color: "#fff",
  },
  setupPrompt: {
    fontSize: 13,
    lineHeight: 18,
  },
  setupNote: {
    fontSize: 12,
    fontWeight: "500",
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

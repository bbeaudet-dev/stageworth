import { useMutation, useQuery } from "convex/react";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useToast } from "@/components/Toast";

const THEATRE_ELEMENTS = [
  "Story & Writing",
  "Music & Score",
  "Vocal Performances",
  "Dance & Choreography",
  "Production Design",
  "Spectacle & Wow Moments",
  "Emotional Resonance",
  "Star Power",
] as const;

const RATING_OPTIONS = [
  { value: 1, label: "Strongly\nDisagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly\nAgree" },
] as const;

const ELEMENT_DESCRIPTIONS: Record<string, string> = {
  "Story & Writing": "A compelling plot and well-crafted dialogue",
  "Music & Score": "Memorable melodies and orchestration",
  "Vocal Performances": "Powerful singing and vocal talent",
  "Dance & Choreography": "Movement, dance numbers, and staging",
  "Production Design": "Sets, costumes, lighting, and visual atmosphere",
  "Spectacle & Wow Moments": "Jaw-dropping surprises and theatrical magic",
  "Emotional Resonance": "Themes and moments that move you deeply",
  "Star Power": "Recognizable performers and standout talent",
};

type Ratings = Record<string, number>;

export default function PreferencesScreen() {
  const prefs = useQuery(api.userPreferences.getUserPreferences, {});
  const updatePrefs = useMutation(api.userPreferences.updateUserPreferences);
  const { showToast } = useToast();

  const [ratings, setRatings] = useState<Ratings>({});
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];
  const isDark = theme === "dark";

  useEffect(() => {
    if (initialized || prefs === undefined) return;
    const initial: Ratings = {};
    for (const el of THEATRE_ELEMENTS) {
      const existing = prefs?.elementRatings?.find((r) => r.element === el);
      initial[el] = existing?.rating ?? 3;
    }
    setRatings(initial);
    setInitialized(true);
  }, [prefs, initialized]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const elementRatings = THEATRE_ELEMENTS.map((el) => ({
        element: el,
        rating: ratings[el] ?? 3,
      }));
      await updatePrefs({ elementRatings });
      showToast({ message: "Preferences saved" });
    } catch {
      showToast({ message: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = (() => {
    if (!prefs?.elementRatings) return Object.keys(ratings).length > 0;
    for (const el of THEATRE_ELEMENTS) {
      const saved = prefs.elementRatings.find((r) => r.element === el);
      if ((saved?.rating ?? 3) !== (ratings[el] ?? 3)) return true;
    }
    return false;
  })();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: c.background }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Theatre Preferences",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.intro, { color: c.mutedText }]}>
          Rate how important each element is to your theatre experience. We will use this to give
          you personalized recommendations.
        </Text>

        {THEATRE_ELEMENTS.map((element) => (
          <View
            key={element}
            style={[s.elementCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}
          >
            <Text style={[s.elementName, { color: c.text }]}>{element}</Text>
            <Text style={[s.elementDescription, { color: c.mutedText }]}>
              {ELEMENT_DESCRIPTIONS[element]}
            </Text>
            <View style={s.ratingRow}>
              {RATING_OPTIONS.map((opt) => {
                const selected = ratings[element] === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRatings((prev) => ({ ...prev, [element]: opt.value }))}
                    style={[
                      s.ratingOption,
                      {
                        backgroundColor: selected
                          ? c.accent
                          : isDark
                            ? "rgba(255,255,255,0.06)"
                            : "#F5F5F5",
                        borderColor: selected ? c.accent : c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.ratingLabel,
                        { color: selected ? c.onAccent : c.mutedText },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[s.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !hasChanges}
          style={[
            s.saveBtn,
            { backgroundColor: c.accent, opacity: isSaving || !hasChanges ? 0.45 : 1 },
          ]}
        >
          <Text style={[s.saveBtnText, { color: c.onAccent }]}>
            {isSaving ? "Saving…" : "Save Preferences"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100, gap: 14 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  elementCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  elementName: { fontSize: 16, fontWeight: "700" },
  elementDescription: { fontSize: 13, lineHeight: 18 },
  ratingRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  ratingOption: {
    flex: 1,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  ratingLabel: { fontSize: 10, fontWeight: "600", textAlign: "center", lineHeight: 13 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700" },
});

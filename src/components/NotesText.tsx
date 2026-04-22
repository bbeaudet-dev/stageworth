/**
 * NotesText — renders free-form user notes and hides Discord-style
 * spoiler markers (`||spoiler||`) behind a tap-to-reveal span.
 *
 * Hidden spoiler spans show a gray pill the same width/height as the real
 * text. Tapping flips the span to a subtle highlighted state so other
 * readers can see it _was_ a spoiler.
 */

import { useMemo, useState } from "react";
import { StyleSheet, Text, TextStyle, type StyleProp } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type NotesTextProps = {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Optional color override for non-spoiler text. */
  color?: string;
};

type Segment =
  | { kind: "text"; text: string }
  | { kind: "spoiler"; text: string; id: number };

/**
 * Splits a string on `||…||` pairs. Stray single `|` or unclosed runs are
 * treated as plain text. Empty spoiler blocks (`||||`) are skipped.
 */
export function parseSpoilerSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  let spoilerId = 0;
  const re = /\|\|([\s\S]+?)\|\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > cursor) {
      segments.push({ kind: "text", text: input.slice(cursor, m.index) });
    }
    const inner = m[1];
    if (inner.length > 0) {
      segments.push({ kind: "spoiler", text: inner, id: spoilerId++ });
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < input.length) {
    segments.push({ kind: "text", text: input.slice(cursor) });
  }
  return segments;
}

export function NotesText({ text, style, color }: NotesTextProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";
  const c = Colors[theme];

  const segments = useMemo(() => parseSpoilerSegments(text), [text]);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());

  const hiddenBg = theme === "dark" ? "#2a2a32" : "#d9d9df";
  const revealedBg = theme === "dark" ? "#32323b" : "#eaeaef";

  return (
    <Text style={[style, color ? { color } : null]}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <Text key={`t-${i}`}>{seg.text}</Text>;
        }
        const isRevealed = revealed.has(seg.id);
        return (
          <Text
            key={`s-${seg.id}`}
            onPress={() => {
              setRevealed((prev) => {
                const next = new Set(prev);
                if (next.has(seg.id)) next.delete(seg.id);
                else next.add(seg.id);
                return next;
              });
            }}
            style={[
              styles.spoiler,
              {
                backgroundColor: isRevealed ? revealedBg : hiddenBg,
                color: isRevealed ? (color ?? c.text) : hiddenBg,
              },
            ]}
            suppressHighlighting
            accessibilityRole="button"
            accessibilityLabel={
              isRevealed ? "Hide spoiler" : "Reveal spoiler"
            }
          >
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  spoiler: {
    // React Native doesn't support horizontal padding on inline Text reliably,
    // but background color + matched foreground color gives the intended
    // "blurred/covered" look without layout jumps when toggled.
    borderRadius: 3,
  },
});

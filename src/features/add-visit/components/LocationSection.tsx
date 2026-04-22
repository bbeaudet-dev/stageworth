import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";

type Production = {
  _id: Id<"productions">;
  theatre?: string;
  city?: string;
};

type VenueSuggestion = { name: string; city: string; state?: string };

const MAX_THEATRE_CHARS = 24;

function truncateTheatreName(name: string) {
  if (name.length <= MAX_THEATRE_CHARS) return name;
  return `${name.slice(0, MAX_THEATRE_CHARS - 1).trimEnd()}…`;
}

export function LocationSection({
  selectedShowId,
  productions,
  hasOfficialProductions,
  productionOptions,
  selectedProductionId,
  useOtherProduction,
  setSelectedProductionId,
  setUseOtherProduction,
  city,
  setCity,
  theatre,
  setTheatre,
}: {
  selectedShowId: Id<"shows"> | null;
  productions: Production[] | undefined;
  hasOfficialProductions: boolean;
  productionOptions: Production[];
  selectedProductionId: Id<"productions"> | null;
  useOtherProduction: boolean;
  setSelectedProductionId: (id: Id<"productions"> | null) => void;
  setUseOtherProduction: (value: boolean) => void;
  city: string;
  setCity: (value: string) => void;
  theatre: string;
  setTheatre: (value: string) => void;
}) {
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];
  const inputStyle = [styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }];

  // ── Venue autocomplete ──────────────────────────────────────────────────────
  const [venueQuery, setVenueQuery] = useState("");
  const [inputHeight, setInputHeight] = useState(44);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useQuery(
    api.venues.search,
    venueQuery.length >= 2 ? { query: venueQuery } : "skip"
  ) as VenueSuggestion[] | undefined;

  const showDropdown = venueQuery.length >= 2 && suggestions !== undefined && suggestions.length > 0;

  const handleTheatreChange = (text: string) => {
    setTheatre(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = text.trim();
    if (trimmed.length >= 2) {
      debounceRef.current = setTimeout(() => setVenueQuery(trimmed), 200);
    } else {
      setVenueQuery("");
    }
  };

  const dismissDropdown = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setVenueQuery("");
  };

  // Delay dismissal slightly so a tap on a suggestion row can fire first.
  const handleBlur = () => {
    blurTimerRef.current = setTimeout(dismissDropdown, 150);
  };

  const handleSuggestionSelect = (suggestion: VenueSuggestion) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setTheatre(suggestion.name);
    // Include state abbreviation so the field reads "Detroit, MI" — the city
    // normalization in the Convex mutation strips it before saving to the DB.
    setCity(suggestion.state ? `${suggestion.city}, ${suggestion.state}` : suggestion.city);
    dismissDropdown();
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Location</Text>
      {selectedShowId ? (
        <>
          {productions === undefined ? (
            <ActivityIndicator size="small" color={c.mutedText} />
          ) : hasOfficialProductions ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productionRow}
            >
              {productionOptions.map((production) => {
                const selected = selectedProductionId === production._id && !useOtherProduction;
                const rawTheatre = production.theatre?.trim() || "Venue";
                const theatreLabel = truncateTheatreName(rawTheatre);
                const labelParts = [theatreLabel];
                if (production.city) labelParts.push(production.city);
                return (
                  <Pressable
                    key={production._id}
                    style={[
                      styles.productionChip,
                      { borderColor: c.border, backgroundColor: c.surface },
                      selected && [styles.productionChipSelected, { backgroundColor: c.accent, borderColor: c.accent }],
                    ]}
                    onPress={() => {
                      setSelectedProductionId(production._id);
                      setUseOtherProduction(false);
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.productionChipText,
                        { color: c.mutedText },
                        selected && [styles.productionChipTextSelected, { color: c.onAccent }],
                      ]}
                    >
                      {labelParts.join(" · ")}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={[
                  styles.productionChip,
                  { borderColor: c.border, backgroundColor: c.surface },
                  useOtherProduction && [styles.productionChipSelected, { backgroundColor: c.accent, borderColor: c.accent }],
                ]}
                onPress={() => {
                  setUseOtherProduction(true);
                  setSelectedProductionId(null);
                }}
              >
                <Text
                  style={[
                    styles.productionChipText,
                    { color: c.mutedText },
                    useOtherProduction && [styles.productionChipTextSelected, { color: c.onAccent }],
                  ]}
                >
                  Other
                </Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </>
      ) : (
        <Text style={[styles.helperText, { color: c.mutedText }]}>Custom shows use the Other location details below.</Text>
      )}

      {useOtherProduction && (
        <View style={styles.otherForm}>
          {/* Theatre — above City, autocomplete dropdown overlays content below */}
          <View style={localStyles.theatreContainer}>
            <TextInput
              style={inputStyle}
              placeholderTextColor={c.mutedText}
              value={theatre}
              onChangeText={handleTheatreChange}
              onBlur={handleBlur}
              onSubmitEditing={dismissDropdown}
              returnKeyType="done"
              placeholder="Theatre"
              autoCapitalize="words"
              autoCorrect={false}
              onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
            />
            {showDropdown && (
              <View
                style={[
                  localStyles.dropdown,
                  { top: inputHeight + 4, borderColor: c.border, backgroundColor: c.surfaceElevated },
                ]}
              >
                {suggestions!.map((suggestion, index) => (
                  <Pressable
                    key={`${suggestion.name}-${suggestion.city}`}
                    style={[
                      styles.resultRow,
                      { borderTopColor: c.border, backgroundColor: c.surfaceElevated },
                      index === 0 && localStyles.firstRow,
                    ]}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <Text style={[styles.resultName, { color: c.text }]} numberOfLines={1}>
                      {suggestion.name}
                    </Text>
                    <Text style={[styles.resultType, { color: c.mutedText }]}>
                      {suggestion.city}{suggestion.state ? `, ${suggestion.state}` : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* City — auto-filled as "Detroit, MI"; normalization strips state before DB save */}
          <TextInput
            style={inputStyle}
            placeholderTextColor={c.mutedText}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            autoCapitalize="words"
          />
        </View>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  theatreContainer: {
    // zIndex ensures the absolutely-positioned dropdown renders above the City
    // input and any other siblings below it in the form.
    zIndex: 10,
  },
  dropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: "hidden",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    // Android elevation
    elevation: 5,
  },
  firstRow: {
    borderTopWidth: 0,
  },
});

import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles } from "@/features/add-visit/styles";

type Production = {
  _id: Id<"productions">;
  theatre?: string;
  city?: string;
};

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
                const labelParts = [production.theatre?.trim() || "Venue"];
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
          <TextInput
            style={inputStyle}
            placeholderTextColor={c.mutedText}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            autoCapitalize="words"
          />
          <TextInput
            style={inputStyle}
            placeholderTextColor={c.mutedText}
            value={theatre}
            onChangeText={setTheatre}
            placeholder="Theatre"
            autoCapitalize="words"
          />
        </View>
      )}
    </View>
  );
}

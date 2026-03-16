import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { Id } from "@/convex/_generated/dataModel";
import { styles } from "@/features/add-visit/styles";

type Production = {
  _id: Id<"productions">;
  theatre: string;
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
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Location</Text>
      {selectedShowId ? (
        <>
          {productions === undefined ? (
            <ActivityIndicator size="small" color="#999" />
          ) : hasOfficialProductions ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productionRow}
            >
              {productionOptions.map((production) => {
                const selected = selectedProductionId === production._id && !useOtherProduction;
                const labelParts = [production.theatre];
                if (production.city) labelParts.push(production.city);
                return (
                  <Pressable
                    key={production._id}
                    style={[styles.productionChip, selected && styles.productionChipSelected]}
                    onPress={() => {
                      setSelectedProductionId(production._id);
                      setUseOtherProduction(false);
                    }}
                  >
                    <Text
                      style={[styles.productionChipText, selected && styles.productionChipTextSelected]}
                    >
                      {labelParts.join(" · ")}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={[styles.productionChip, useOtherProduction && styles.productionChipSelected]}
                onPress={() => {
                  setUseOtherProduction(true);
                  setSelectedProductionId(null);
                }}
              >
                <Text
                  style={[
                    styles.productionChipText,
                    useOtherProduction && styles.productionChipTextSelected,
                  ]}
                >
                  Other
                </Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </>
      ) : (
        <Text style={styles.helperText}>Custom shows use the Other location details below.</Text>
      )}

      {useOtherProduction && (
        <View style={styles.otherForm}>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
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

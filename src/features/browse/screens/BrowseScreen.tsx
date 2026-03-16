import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductionCard } from "@/features/browse/components/ProductionCard";
import { useBrowseData } from "@/features/browse/hooks/useBrowseData";
import { styles } from "@/features/browse/styles";

export default function BrowseScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [search, setSearch] = useState("");
  const { allProductions, sections } = useBrowseData(search);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Browse</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search shows or theatres…"
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {allProductions === undefined ? (
          <Text style={styles.empty}>Loading…</Text>
        ) : sections.length === 0 ? (
          <Text style={styles.empty}>{search ? "No results." : "No current productions yet."}</Text>
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              {section.data.map((production) => (
                <ProductionCard
                  key={production._id}
                  production={production}
                  onPress={() => {
                    if (!production.show?._id) return;
                    router.push({
                      pathname: "/show/[showId]",
                      params: {
                        showId: String(production.show._id),
                        name: production.show?.name ?? "Show",
                      },
                    });
                  }}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

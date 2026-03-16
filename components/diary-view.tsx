import { useQuery } from "convex/react";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@/convex/_generated/api";

type VisitWithShow = {
  _id: string;
  date: string;
  theatre?: string;
  notes?: string;
  show: {
    _id: string;
    name: string;
    type: string;
    images: string[];
  };
};

type VisitGroup = {
  label: string;
  visits: VisitWithShow[];
};

function getGroupLabel(dateStr: string, now: Date): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const visitDate = new Date(y, m - 1, d);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - visitDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";

  return visitDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function DiaryCard({
  visit,
  onPress,
}: {
  visit: VisitWithShow;
  onPress: () => void;
}) {
  const imageUrl = visit.show.images[0];

  return (
    <Pressable style={cardStyles.card} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={cardStyles.image} />
      ) : (
        <View style={[cardStyles.image, cardStyles.imagePlaceholder]}>
          <Text style={cardStyles.placeholderEmoji}>🎭</Text>
        </View>
      )}
    </Pressable>
  );
}

export function DiaryView() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const visits = useQuery(api.visits.listAllWithShows);

  const groups = useMemo(() => {
    if (!visits) return [];
    const now = new Date();
    const groupMap = new Map<string, VisitWithShow[]>();
    const groupOrder: string[] = [];

    for (const visit of visits as VisitWithShow[]) {
      const label = getGroupLabel(visit.date, now);
      if (!groupMap.has(label)) {
        groupMap.set(label, []);
        groupOrder.push(label);
      }
      groupMap.get(label)!.push(visit);
    }

    return groupOrder.map(
      (label): VisitGroup => ({ label, visits: groupMap.get(label)! })
    );
  }, [visits]);

  if (visits === undefined) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (visits.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>📖</Text>
        <Text style={styles.emptyTitle}>Your diary is empty</Text>
        <Text style={styles.emptySubtitle}>
          Log visits to your shows to see them here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}
    >
      {groups.map((group) => (
        <View key={group.label} style={styles.section}>
          <Text style={styles.sectionLabel}>{group.label}</Text>
          <View style={styles.grid}>
            {group.visits.map((visit) => (
              <DiaryCard
                key={visit._id}
                visit={visit}
                onPress={() =>
                  router.push({
                    pathname: "/visit/[visitId]",
                    params: { visitId: String(visit._id) },
                  })
                }
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const CARD_GAP = 8;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
});

const CARD_ASPECT = 1.5;
const NUM_COLUMNS = 3;

const cardStyles = StyleSheet.create({
  card: {
    width: `${(100 - (NUM_COLUMNS - 1) * 2.2) / NUM_COLUMNS}%` as any,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 1 / CARD_ASPECT,
    backgroundColor: "#e0e0e0",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderEmoji: {
    fontSize: 24,
  },
});

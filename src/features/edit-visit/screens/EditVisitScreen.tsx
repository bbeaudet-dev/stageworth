import { useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { styles as addVisitStyles } from "@/features/add-visit/styles";
import { VisitDateSection } from "@/features/add-visit/components/VisitDateSection";
import { LocationSection } from "@/features/add-visit/components/LocationSection";
import { NotesSection } from "@/features/add-visit/components/NotesSection";
import { TagFriendsSection } from "@/features/add-visit/components/TagFriendsSection";
import { useEditVisitData } from "@/features/edit-visit/hooks/useEditVisitData";
import { useEditVisitFormState } from "@/features/edit-visit/hooks/useEditVisitFormState";

export default function EditVisitScreen({ visitId }: { visitId: Id<"visits"> }) {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useColorScheme() ?? "light";
  const c = Colors[theme];

  const { visit, productions, productionOptions, hasOfficialProductions, myFollowing, updateVisit } =
    useEditVisitData(visitId);

  const [initialized, setInitialized] = useState(false);
  const allowRemoveRef = useRef(false);

  const {
    state,
    reinitialize,
    setDate,
    setSelectedProductionId,
    setUseOtherProduction,
    setCity,
    setTheatre,
    setNotes,
    setIsSaving,
    toggleTaggedUser,
  } = useEditVisitFormState({
    date: "",
    productionId: null,
    city: null,
    theatre: null,
    notes: null,
    taggedUserIds: null,
  });

  useEffect(() => {
    if (!visit || initialized) return;
    reinitialize({
      date: visit.date,
      productionId: visit.productionId ?? null,
      city: visit.city ?? null,
      theatre: visit.theatre ?? null,
      notes: visit.notes ?? null,
      taggedUserIds: (visit.taggedUserIds as Id<"users">[] | undefined) ?? null,
    });
    setInitialized(true);
  }, [visit, initialized, reinitialize]);

  const hasUnsavedChanges =
    initialized &&
    visit !== null &&
    (state.date !== visit.date ||
      state.selectedProductionId !== (visit.productionId ?? null) ||
      state.city !== (visit.city ?? "") ||
      state.theatre !== (visit.theatre ?? "") ||
      state.notes !== (visit.notes ?? "") ||
      JSON.stringify([...state.taggedUserIds].sort()) !==
        JSON.stringify([...(visit.taggedUserIds ?? [])].sort()));

  usePreventRemove(hasUnsavedChanges && !state.isSaving && !allowRemoveRef.current, (event) => {
    Alert.alert("Discard changes?", "You have unsaved edits to this visit.", [
      { text: "Keep editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          allowRemoveRef.current = true;
          navigation.dispatch(event.data.action);
        },
      },
    ]);
  });

  const handleSave = async () => {
    if (!visit || state.isSaving) return;
    setIsSaving(true);
    try {
      await updateVisit({
        visitId,
        date: state.date,
        productionId: state.useOtherProduction ? undefined : (state.selectedProductionId ?? undefined),
        city: state.useOtherProduction ? state.city.trim() || undefined : undefined,
        theatre: state.useOtherProduction ? state.theatre.trim() || undefined : undefined,
        notes: state.notes.trim() || undefined,
        taggedUserIds: state.taggedUserIds.length > 0 ? state.taggedUserIds : undefined,
      });
      allowRemoveRef.current = true;
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  if (!visit || !initialized) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "bottom"]}>
        <View style={[addVisitStyles.header, { borderBottomColor: c.border }]}>
          <Text style={[addVisitStyles.title, { color: c.text }]}>Edit Visit</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[addVisitStyles.closeText, { color: c.accent }]}>Close</Text>
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[addVisitStyles.header, { borderBottomColor: c.border }]}>
          <Text style={[addVisitStyles.title, { color: c.text }]}>Edit Visit</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[addVisitStyles.closeText, { color: c.accent }]}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={addVisitStyles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={addVisitStyles.section}>
            <Text style={[addVisitStyles.sectionTitle, { color: c.text }]}>Show</Text>
            <View style={[styles.showCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.showName, { color: c.text }]}>{visit.show?.name ?? "Unknown Show"}</Text>
              <Text style={[styles.showSubtext, { color: c.mutedText }]}>Show cannot be changed</Text>
            </View>
          </View>

          <VisitDateSection date={state.date} setDate={setDate} />

          <LocationSection
            selectedShowId={visit.showId}
            productions={productions}
            hasOfficialProductions={hasOfficialProductions}
            productionOptions={productionOptions as any}
            selectedProductionId={state.selectedProductionId}
            useOtherProduction={state.useOtherProduction}
            setSelectedProductionId={setSelectedProductionId}
            setUseOtherProduction={setUseOtherProduction}
            city={state.city}
            setCity={setCity}
            theatre={state.theatre}
            setTheatre={setTheatre}
          />

          <NotesSection notes={state.notes} setNotes={setNotes} />

          <TagFriendsSection
            following={myFollowing}
            taggedUserIds={state.taggedUserIds}
            onToggle={toggleTaggedUser}
          />

          <Pressable
            style={[
              addVisitStyles.saveButton,
              { backgroundColor: c.accent },
              state.isSaving && addVisitStyles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={state.isSaving}
          >
            <Text style={addVisitStyles.saveButtonText}>
              {state.isSaving ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  showCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    gap: 3,
  },
  showName: {
    fontSize: 17,
    fontWeight: "600",
  },
  showSubtext: {
    fontSize: 13,
  },
});

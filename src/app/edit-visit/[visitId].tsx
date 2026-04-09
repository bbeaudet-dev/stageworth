import { useLocalSearchParams } from "expo-router";

import type { Id } from "@/convex/_generated/dataModel";
import EditVisitScreen from "@/features/edit-visit/screens/EditVisitScreen";

export default function EditVisitPage() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  return <EditVisitScreen visitId={visitId as Id<"visits">} />;
}

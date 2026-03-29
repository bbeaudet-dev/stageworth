import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CustomListRow, SystemListRow, VisibleProfileList } from "@/features/profile/types";

export function useProfileListsData() {
  const profileLists = useQuery(api.lists.getProfileLists);
  const createCustomList = useMutation(api.lists.createCustomList);
  const initializeSystemLists = useMutation(api.lists.initializeSystemLists);
  const setListVisibility = useMutation(api.lists.setListVisibility);

  const systemLists = useMemo(
    () => (profileLists?.systemLists ?? []) as SystemListRow[],
    [profileLists]
  );
  const customLists = useMemo(
    () => (profileLists?.customLists ?? []) as CustomListRow[],
    [profileLists]
  );
  const visibleLists = useMemo<VisibleProfileList[]>(() => {
    const seenRow = profileLists
      ? [
          {
            _id: "seen" as const,
            name: "Seen",
            isPublic: false,
            showCount: profileLists.seen.showCount,
            isSeen: true,
            systemKey: "seen",
          },
        ]
      : [];

    const dynamicSystem = systemLists.map((list) => ({
      _id: list._id,
      name: list.name,
      isPublic: list.isPublic,
      showCount: list.showCount,
      isSeen: false,
      systemKey: list.systemKey,
    }));

    const custom = customLists.map((list) => ({
      _id: list._id,
      name: list.name,
      isPublic: list.isPublic,
      showCount: list.showCount,
      isSeen: false,
      systemKey: undefined,
    }));

    return [...dynamicSystem, ...seenRow, ...custom];
  }, [customLists, profileLists, systemLists]);

  const toggleVisibility = async (listId: Id<"userLists">, isPublic: boolean) =>
    setListVisibility({ listId, isPublic: !isPublic });

  return {
    profileLists,
    visibleLists,
    initializeSystemLists,
    createCustomList,
    toggleVisibility,
  };
}

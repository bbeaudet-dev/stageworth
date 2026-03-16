import type { Id } from "@/convex/_generated/dataModel";

export type SystemListRow = {
  _id: Id<"userLists">;
  name: string;
  systemKey?: string;
  isPublic: boolean;
  showCount: number;
};

export type CustomListRow = {
  _id: Id<"userLists">;
  name: string;
  isPublic: boolean;
  showCount: number;
};

export type VisibleProfileList = {
  _id: Id<"userLists"> | "seen";
  name: string;
  isPublic: boolean;
  showCount: number;
  isSeen: boolean;
  systemKey?: string;
};

/**
 * Opens a native action sheet with safety actions (Report / Block) for a
 * given user or feed post. Used by the community feed overflow menu and
 * the public profile header.
 *
 * The hook manages its own local state for which ReportSheet target is
 * active; callers just render <ReportSheet /> from the returned `reportSheet`
 * handle (or use the imperative `close`).
 */
import { useCallback, useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import type { Id } from "@/convex/_generated/dataModel";

import type { ReportTarget } from "./ReportSheet";
import { useBlockUser } from "./useBlockUser";

export type ActorInfo = {
  userId: Id<"users">;
  username?: string;
};

export type SafetyActionTarget =
  | { kind: "user"; user: ActorInfo }
  | {
      kind: "post";
      postId: Id<"activityPosts">;
      author: ActorInfo;
    };

export function useSafetyActions() {
  const { confirmBlock } = useBlockUser();
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const closeReportSheet = useCallback(() => setReportTarget(null), []);

  const openSafetyActions = useCallback(
    (target: SafetyActionTarget) => {
      const author =
        target.kind === "user" ? target.user : target.author;
      const handle = author.username ? `@${author.username}` : "this user";
      const options: {
        label: string;
        destructive?: boolean;
        onPress: () => void;
      }[] = [];

      if (target.kind === "post") {
        options.push({
          label: "Report post",
          onPress: () =>
            setReportTarget({
              kind: "activityPost",
              postId: target.postId,
              label: handle,
            }),
        });
      }

      options.push({
        label: "Report user",
        onPress: () =>
          setReportTarget({
            kind: "user",
            userId: author.userId,
            label: handle,
          }),
      });

      options.push({
        label: `Block ${handle}`,
        destructive: true,
        onPress: () => confirmBlock(author.userId, author.username),
      });

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [...options.map((o) => o.label), "Cancel"],
            cancelButtonIndex: options.length,
            destructiveButtonIndex: options.findIndex((o) => o.destructive),
          },
          (selectedIndex) => {
            if (selectedIndex === options.length) return;
            const choice = options[selectedIndex];
            if (choice) choice.onPress();
          }
        );
      } else {
        Alert.alert(
          "More actions",
          undefined,
          [
            ...options.map((o) => ({
              text: o.label,
              style: (o.destructive ? "destructive" : "default") as
                | "default"
                | "destructive"
                | "cancel",
              onPress: o.onPress,
            })),
            { text: "Cancel", style: "cancel" as const },
          ]
        );
      }
    },
    [confirmBlock]
  );

  return {
    openSafetyActions,
    reportTarget,
    closeReportSheet,
  };
}

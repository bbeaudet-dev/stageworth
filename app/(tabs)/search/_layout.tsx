import { Stack } from "expo-router";

export default function SearchStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/*
       * getId makes React Navigation treat each push to show/[showId] as a
       * distinct stack entry when _ts differs. Without this, navigating to the
       * same route name a second time can reuse the existing stack entry
       * instead of pushing a new one, causing the back button to vanish.
       * The _ts param (Date.now()) is included in every navigateToShow call.
       */}
      <Stack.Screen
        name="show/[showId]"
        getId={({ params }) =>
          `${String(params?.showId ?? "")}-${String(params?._ts ?? "0")}`
        }
      />
    </Stack>
  );
}

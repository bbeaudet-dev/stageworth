import type { TextInput } from "react-native";

/**
 * Module-level ref so the tab layout can focus the search input on tab press
 * without needing a context or prop drilling.
 */
export let searchInputRef: TextInput | null = null;

export function setSearchInputRef(ref: TextInput | null) {
  searchInputRef = ref;
}

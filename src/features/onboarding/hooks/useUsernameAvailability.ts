import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { api } from "@/convex/_generated/api";

const DEBOUNCE_MS = 300;

export type UsernameStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; sanitized: string }
  | { state: "taken"; sanitized: string }
  | { state: "invalid"; sanitized: string; reason: "too_short" };

/**
 * Debounced username availability check. Returns the current status string,
 * the sanitized form (lowercase, stripped, truncated), and whether the value
 * is acceptable for a "Confirm" button.
 */
export function useUsernameAvailability(input: string): {
  status: UsernameStatus;
  sanitized: string;
  isAcceptable: boolean;
} {
  const [debounced, setDebounced] = useState(input);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const isStale = debounced !== input;

  const result = useQuery(
    api.onboarding.checkUsernameAvailable,
    debounced.trim().length > 0 ? { username: debounced } : "skip"
  );

  const sanitized = result?.candidate ?? "";

  let status: UsernameStatus;
  if (debounced.trim().length === 0) {
    status = { state: "idle" };
  } else if (isStale || result === undefined) {
    status = { state: "checking" };
  } else if (!result.available && result.reason === "too_short") {
    status = { state: "invalid", sanitized, reason: "too_short" };
  } else if (!result.available && result.reason === "taken") {
    status = { state: "taken", sanitized };
  } else if (result.available) {
    status = { state: "available", sanitized };
  } else {
    status = { state: "checking" };
  }

  const isAcceptable = status.state === "available";

  return { status, sanitized, isAcceptable };
}

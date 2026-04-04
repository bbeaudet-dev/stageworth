import { useCallback, useRef } from "react";

/**
 * Returns a wrapper that prevents a navigation handler from firing more than
 * once within `cooldownMs` milliseconds. Use this around `router.push` /
 * `router.navigate` calls on tappable list items to avoid stacking duplicate
 * screens when the user taps rapidly before the new screen has loaded.
 */
export function useNavGuard(cooldownMs = 800) {
  const lastNavAt = useRef(0);

  const guard = useCallback(
    <T extends unknown[]>(fn: (...args: T) => void) =>
      (...args: T) => {
        const now = Date.now();
        if (now - lastNavAt.current < cooldownMs) return;
        lastNavAt.current = now;
        fn(...args);
      },
    [cooldownMs],
  );

  return guard;
}

import { useState } from 'react';

function haveDepsChanged(previous: readonly unknown[] | null, next: readonly unknown[]): boolean {
  if (previous === null || previous.length !== next.length) return true;
  return next.some((value, index) => !Object.is(value, previous[index]));
}

/**
 * Returns true during the render where `deps` differ (Object.is, element by element) from the
 * previous render, and on the first render, like an effect dependency array would.
 * Lets a component adjust its own state while rendering ("adjusting state when a prop changes")
 * instead of calling setState synchronously in an effect. Only call setters of the same component.
 */
export function useDepsChanged(deps: readonly unknown[]): boolean {
  const [previousDeps, setPreviousDeps] = useState<readonly unknown[] | null>(null);
  const changed = haveDepsChanged(previousDeps, deps);
  if (changed) {
    setPreviousDeps(deps);
  }
  return changed;
}

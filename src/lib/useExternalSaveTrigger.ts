import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Runs `handleSave` each time `saveCount` increases after mount.
 * The value seen at mount is ignored, so a remounted form (e.g. after a reload)
 * does not replay a save request already handled; this also keeps StrictMode's
 * double mount effect from triggering a save.
 * The latest `handleSave` is captured in a layout effect, so it is current
 * before the passive trigger effect runs.
 */
export function useExternalSaveTrigger(saveCount: number | undefined, handleSave: () => unknown): void {
  const handleSaveRef = useRef(handleSave);
  const lastSaveCountRef = useRef(saveCount ?? 0);

  useLayoutEffect(() => {
    handleSaveRef.current = handleSave;
  });

  useEffect(() => {
    const current = saveCount ?? 0;
    const previous = lastSaveCountRef.current;
    lastSaveCountRef.current = current;
    if (current > previous) void handleSaveRef.current();
  }, [saveCount]);
}

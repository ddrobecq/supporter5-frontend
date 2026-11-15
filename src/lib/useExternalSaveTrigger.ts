import { useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { TabSaveSettleContext } from './useTabFormPaneBridge';

/**
 * Runs `handleSave` each time `saveCount` increases after mount.
 * The value seen at mount is ignored, so a remounted form (e.g. after a reload)
 * does not replay a save request already handled; this also keeps StrictMode's
 * double mount effect from triggering a save.
 * The latest `handleSave` is captured in a layout effect, so it is current
 * before the passive trigger effect runs.
 * Once the triggered save ends (success, rejection or early validation return),
 * the tab's `TabSaveSettleContext` is called, if any, with `true` when `handleSave` resolved to `true`.
 */
export function useExternalSaveTrigger(saveCount: number | undefined, handleSave: () => unknown): void {
  const settle = useContext(TabSaveSettleContext);
  const handleSaveRef = useRef(handleSave);
  const settleRef = useRef(settle);
  const lastSaveCountRef = useRef(saveCount ?? 0);

  useLayoutEffect(() => {
    handleSaveRef.current = handleSave;
    settleRef.current = settle;
  });

  useEffect(() => {
    const current = saveCount ?? 0;
    const previous = lastSaveCountRef.current;
    lastSaveCountRef.current = current;
    if (current <= previous) return;
    void Promise.resolve()
      .then(() => handleSaveRef.current())
      .then(
        (result) => settleRef.current?.(result === true),
        () => {
          // Erreur deja affichee par le formulaire ou le snackbar du pane; settle debloque la fermeture.
          settleRef.current?.(false);
        },
      );
  }, [saveCount]);
}

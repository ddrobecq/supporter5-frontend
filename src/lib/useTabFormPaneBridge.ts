import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { emitTabSaveDone, emitTabSaveFailed, TAB_EVENTS, useTabMetaEvents } from './useTabMetaEvents';

/**
 * Fourni par les panes qui passent `saveRequestCount` au formulaire: le formulaire appelle
 * `settle(saved)` quand une sauvegarde declenchee par saveCount se termine. Si `notifySaveDone`
 * n'a pas ete appele entre-temps, la confirmation de fermeture recoit saveDone quand `saved`
 * vaut true (ex: seul un sous-formulaire a ete enregistre), saveFailed sinon.
 * `null` hors d'un onglet: aucun effet.
 */
export const TabSaveSettleContext = createContext<((saved: boolean) => void) | null>(null);

interface UseTabFormPaneBridgeArgs {
  tabPath: string;
  // true/false: le pont signale lui-meme saveDone/saveFailed; undefined: le composant le fait (notifySaveDone).
  onSaveRequest?: () => boolean | Promise<boolean> | void | Promise<void>;
}

interface UseTabFormPaneBridgeResult {
  setDirty: (dirty: boolean) => void;
  setLabel: (label: string) => void;
  setLabelStyle: (italic: boolean) => void;
  saveRequestCount: number;
  notifySaveDone: () => void;
  settleSave: (saved: boolean) => void;
}

export function useTabFormPaneBridge({ tabPath, onSaveRequest }: UseTabFormPaneBridgeArgs): UseTabFormPaneBridgeResult {
  const { setDirty, setLabel, setLabelStyle } = useTabMetaEvents(tabPath);
  const [saveRequestCount, setSaveRequestCount] = useState(0);
  const onSaveRequestRef = useRef(onSaveRequest);
  // Requete recue par le chemin saveRequestCount, sans saveDone ni saveFailed envoye.
  const pendingRequestRef = useRef(false);

  useEffect(() => {
    onSaveRequestRef.current = onSaveRequest;
  }, [onSaveRequest]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string }>;
      if (customEvent.detail?.path !== tabPath) {
        return;
      }

      const onSave = onSaveRequestRef.current;
      if (onSave) {
        void (async () => {
          try {
            const result = await onSave();
            if (result === true) emitTabSaveDone(tabPath);
            else if (result === false) emitTabSaveFailed(tabPath);
          } catch {
            // L'erreur est affichee par le composant; on debloque la confirmation de fermeture.
            emitTabSaveFailed(tabPath);
          }
        })();
        return;
      }

      pendingRequestRef.current = true;
      setSaveRequestCount((current) => current + 1);
    };

    window.addEventListener(TAB_EVENTS.saveRequest, handler);
    return () => window.removeEventListener(TAB_EVENTS.saveRequest, handler);
  }, [tabPath]);

  const notifySaveDone = useCallback(() => {
    pendingRequestRef.current = false;
    emitTabSaveDone(tabPath);
  }, [tabPath]);

  const settleSave = useCallback((saved: boolean) => {
    if (!pendingRequestRef.current) return;
    pendingRequestRef.current = false;
    if (saved) emitTabSaveDone(tabPath);
    else emitTabSaveFailed(tabPath);
  }, [tabPath]);

  return {
    setDirty,
    setLabel,
    setLabelStyle,
    saveRequestCount,
    notifySaveDone,
    settleSave,
  };
}

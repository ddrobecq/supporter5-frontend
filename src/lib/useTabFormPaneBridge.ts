import { useEffect, useRef, useState } from 'react';
import { emitTabSaveDone, emitTabSaveFailed, TAB_EVENTS, useTabMetaEvents } from './useTabMetaEvents';

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
}

export function useTabFormPaneBridge({ tabPath, onSaveRequest }: UseTabFormPaneBridgeArgs): UseTabFormPaneBridgeResult {
  const { setDirty, setLabel, setLabelStyle } = useTabMetaEvents(tabPath);
  const [saveRequestCount, setSaveRequestCount] = useState(0);
  const onSaveRequestRef = useRef(onSaveRequest);

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

      setSaveRequestCount((current) => current + 1);
    };

    window.addEventListener(TAB_EVENTS.saveRequest, handler);
    return () => window.removeEventListener(TAB_EVENTS.saveRequest, handler);
  }, [tabPath]);

  return {
    setDirty,
    setLabel,
    setLabelStyle,
    saveRequestCount,
    notifySaveDone: () => emitTabSaveDone(tabPath),
  };
}

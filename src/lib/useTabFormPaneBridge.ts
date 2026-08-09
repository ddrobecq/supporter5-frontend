import { useEffect, useRef, useState } from 'react';
import { emitTabSaveDone, useTabMetaEvents } from './useTabMetaEvents';

interface UseTabFormPaneBridgeArgs {
  tabPath: string;
  onSaveRequest?: () => void | Promise<void>;
}

interface UseTabFormPaneBridgeResult {
  setDirty: (dirty: boolean) => void;
  setLabel: (label: string) => void;
  saveRequestCount: number;
  notifySaveDone: () => void;
}

export function useTabFormPaneBridge({ tabPath, onSaveRequest }: UseTabFormPaneBridgeArgs): UseTabFormPaneBridgeResult {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
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

      if (onSaveRequestRef.current) {
        void onSaveRequestRef.current();
        return;
      }

      setSaveRequestCount((current) => current + 1);
    };

    window.addEventListener('supporter:tab-save-request', handler);
    return () => window.removeEventListener('supporter:tab-save-request', handler);
  }, [tabPath]);

  return {
    setDirty,
    setLabel,
    saveRequestCount,
    notifySaveDone: () => emitTabSaveDone(tabPath),
  };
}

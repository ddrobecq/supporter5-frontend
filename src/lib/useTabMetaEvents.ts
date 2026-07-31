import { useCallback } from 'react';

function emitTabDirty(path: string, dirty: boolean): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path, dirty } }));
}

function emitTabLabel(path: string, label: string): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path, label } }));
}

export function emitTabSaveRequest(path: string): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-save-request', { detail: { path } }));
}

export function emitTabSaveDone(path: string): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-save-done', { detail: { path } }));
}

export function useTabMetaEvents(tabPath: string) {
  const setDirty = useCallback((dirty: boolean) => {
    emitTabDirty(tabPath, dirty);
  }, [tabPath]);

  const setLabel = useCallback((label: string) => {
    emitTabLabel(tabPath, label);
  }, [tabPath]);

  return { setDirty, setLabel };
}

export { emitTabDirty, emitTabLabel };

import { useCallback } from 'react';

function emitTabDirty(path: string, dirty: boolean): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path, dirty } }));
}

function emitTabLabel(path: string, label: string): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path, label } }));
}

function emitTabLabelStyle(path: string, italic: boolean): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-label-style', { detail: { path, italic } }));
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

  const setLabelStyle = useCallback((italic: boolean) => {
    emitTabLabelStyle(tabPath, italic);
  }, [tabPath]);

  return { setDirty, setLabel, setLabelStyle };
}

export { emitTabDirty, emitTabLabel, emitTabLabelStyle };

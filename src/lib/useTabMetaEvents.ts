import { useCallback } from 'react';

export const TAB_EVENTS = {
  open: 'supporter:tab-open',
  dirty: 'supporter:tab-dirty',
  label: 'supporter:tab-label',
  labelStyle: 'supporter:tab-label-style',
  saveRequest: 'supporter:tab-save-request',
  saveDone: 'supporter:tab-save-done',
} as const;

export interface TabOpenEventDetail {
  path?: string;
  label?: string;
  unique?: boolean;
  uniqueByPath?: boolean;
}

export function emitTabOpen(path: string, label?: string, options?: { unique?: boolean; uniqueByPath?: boolean }): void {
  window.dispatchEvent(new CustomEvent<TabOpenEventDetail>(TAB_EVENTS.open, { detail: { path, label, ...options } }));
}

function emitTabDirty(path: string, dirty: boolean): void {
  window.dispatchEvent(new CustomEvent(TAB_EVENTS.dirty, { detail: { path, dirty } }));
}

function emitTabLabel(path: string, label: string): void {
  window.dispatchEvent(new CustomEvent(TAB_EVENTS.label, { detail: { path, label } }));
}

function emitTabLabelStyle(path: string, italic: boolean): void {
  window.dispatchEvent(new CustomEvent(TAB_EVENTS.labelStyle, { detail: { path, italic } }));
}

export function emitTabSaveRequest(path: string): void {
  window.dispatchEvent(new CustomEvent(TAB_EVENTS.saveRequest, { detail: { path } }));
}

export function emitTabSaveDone(path: string): void {
  window.dispatchEvent(new CustomEvent(TAB_EVENTS.saveDone, { detail: { path } }));
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

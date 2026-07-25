import { useCallback, useState } from 'react';

export function useDirtySignature(
  open: boolean,
  onDirtyChange?: (dirty: boolean) => void,
) {
  const [initialSignature, setInitialSignatureState] = useState('');

  const setInitialSignature = useCallback((signature: string) => {
    setInitialSignatureState(signature);
  }, []);

  const syncDirty = useCallback((currentSignature: string) => {
    if (!open || !initialSignature) return;
    onDirtyChange?.(currentSignature !== initialSignature);
  }, [initialSignature, onDirtyChange, open]);

  const markClean = useCallback(() => {
    onDirtyChange?.(false);
  }, [onDirtyChange]);

  return {
    initialSignature,
    setInitialSignature,
    syncDirty,
    markClean,
  };
}

import { useCallback, useState } from 'react';

/**
 * Tracks which `DateInputField`s of a form currently hold an invalid entry, so that the form
 * can block saving. Wire each field with `onValidityChange={dateValidityHandler('<key>')}`.
 */
export function useInvalidDateFields() {
  const [invalidKeys, setInvalidKeys] = useState<ReadonlySet<string>>(() => new Set());

  const dateValidityHandler = useCallback((key: string) => (valid: boolean): void => {
    setInvalidKeys((prev) => {
      if (valid !== prev.has(key)) return prev;
      const next = new Set(prev);
      if (valid) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isDateInvalid = useCallback((...keys: string[]): boolean => (
    keys.length === 0 ? invalidKeys.size > 0 : keys.some((key) => invalidKeys.has(key))
  ), [invalidKeys]);

  return { dateValidityHandler, isDateInvalid };
}

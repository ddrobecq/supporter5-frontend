import { useLayoutEffect, useRef, useState } from 'react';

type Handlers = Record<string, (...args: never[]) => unknown>;

/**
 * Returns stable wrappers that always call the latest version of each handler (refreshed after every
 * commit), so memoized grid columns can use them without listing every handler as a dependency.
 */
export function useLatestHandlers<T extends Handlers>(handlers: T): T {
  const latestRef = useRef(handlers);
  useLayoutEffect(() => {
    latestRef.current = handlers;
  });
  const [stableHandlers] = useState(() => {
    const wrappers: Handlers = {};
    for (const key of Object.keys(handlers)) {
      wrappers[key] = (...args: never[]) => (latestRef.current as Handlers)[key](...args);
    }
    return wrappers as T;
  });
  return stableHandlers;
}

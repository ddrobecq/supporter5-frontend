import { useEffect, useState, type DependencyList } from 'react';

interface UseStatRowsOptions<Row> {
  enabled?: boolean;
  fallbackRows?: Row[];
}

export function useStatRows<Row>(
  fetchRows: (signal: AbortSignal) => Promise<Row[]>,
  deps: DependencyList,
  options: UseStatRowsOptions<Row> = {},
) {
  const { enabled = true, fallbackRows = [] } = options;
  const [rows, setRows] = useState<Row[]>(fallbackRows);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchRows(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRows(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRows(fallbackRows);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { rows, loading };
}
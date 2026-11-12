import { useEffect, useState, type DependencyList } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
import { isAbortError } from '../../lib/httpErrors';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchRows(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRows(data);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setRows(fallbackRows);
          if (!isAbortError(err)) setError(toErrorMessage(err));
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

  return { rows, loading, error };
}
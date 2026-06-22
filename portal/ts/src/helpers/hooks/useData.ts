import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KineticError } from '../../types/kinetic';

export interface UseDataResult<TResponse> {
  initialized: boolean;
  loading: boolean;
  response: TResponse | null;
  actions: { reloadData: () => void };
}

/**
 * Project-local typed `useData` hook.
 *
 * `fn` is the fetch function (typically a `@kineticdata/react` helper). `params`
 * is its argument object — pass `null` to skip the fetch. **Memoize params at the
 * call site** with `useMemo`; identity-comparison drives whether the hook
 * re-runs the fetch on every render (see `front-end/data-fetching` for the
 * param-object-identity hazard).
 *
 * @typeParam TParams   Shape of the fetch function's argument
 * @typeParam TResponse Shape the fetch function resolves with — typically `{ submission?: ..., error?: ... }`
 */
export function useData<TParams, TResponse extends { error?: KineticError }>(
  fn: (params: TParams) => Promise<TResponse>,
  params: TParams | null,
): UseDataResult<TResponse> {
  const [[response, lastTimestamp], setData] = useState<[TResponse | null, number | null]>([null, null]);

  const executeQuery = useCallback(() => {
    if (params) {
      const timestamp = new Date().getTime();
      setData(([d]) => [d, timestamp]);
      fn(params).then((result) => {
        setData(([d, ts]) => (ts === timestamp ? [result, null] : [d, ts]));
      });
    } else {
      setData(([, ts]) => [null, ts]);
    }
  }, [fn, params]);

  useEffect(() => { executeQuery(); }, [executeQuery]);

  return useMemo(
    () => ({
      initialized: params != null,
      loading: params != null && (response == null || lastTimestamp != null),
      response,
      actions: { reloadData: executeQuery },
    }),
    [params, response, lastTimestamp, executeQuery],
  );
}

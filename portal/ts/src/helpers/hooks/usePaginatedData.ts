import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from './usePagination';
import type { KineticError } from '../../types/kinetic';

export interface PaginatedResponse<TItem> {
  nextPageToken?: string | null;
  error?: KineticError;
  // The list key varies — `submissions`, `users`, `forms` etc. — so the response
  // type carries it as an indexed field.
  [listKey: string]: TItem[] | string | null | KineticError | undefined;
}

export interface UsePaginatedDataResult<TResponse> {
  initialized: boolean;
  loading: boolean;
  response: TResponse | null;
  pageNumber: number;
  actions: {
    reloadData: () => void;
    previousPage: (() => void) | undefined;
    nextPage: (() => void) | undefined;
    resetPagination: () => void;
  };
}

/**
 * Typed paginated-data hook. Same param-identity hazard as `useData` — memoize
 * the params object at the call site.
 */
export function usePaginatedData<TParams extends Record<string, unknown>, TResponse extends { nextPageToken?: string | null; error?: KineticError }>(
  fn: (params: TParams & { pageToken?: string }) => Promise<TResponse>,
  params: TParams | null,
): UsePaginatedDataResult<TResponse> {
  const { pageToken, setNextPageToken, pageNumber, resetPagination, previousPage, nextPage } = usePagination();
  const [[response, lastTimestamp], setData] = useState<[TResponse | null, number | null]>([null, null]);

  const executeQuery = useCallback(() => {
    if (params) {
      const timestamp = new Date().getTime();
      setData(([d]) => [d, timestamp]);
      fn({ ...params, pageToken } as TParams & { pageToken?: string }).then((result) => {
        setData(([d, ts]) => {
          if (ts === timestamp) {
            setNextPageToken(result?.nextPageToken ?? undefined);
            return [result, null];
          }
          return [d, ts];
        });
      });
    } else {
      setData(([, ts]) => [null, ts]);
    }
  }, [fn, params, pageToken, setNextPageToken]);

  useEffect(() => { executeQuery(); }, [executeQuery]);

  // Reset pagination when params change but pageToken doesn't (filter change)
  // — callers can opt into this by triggering resetPagination themselves.

  return useMemo(
    () => ({
      initialized: params != null,
      loading: params != null && (response == null || lastTimestamp != null),
      response,
      pageNumber,
      actions: {
        reloadData: executeQuery,
        previousPage,
        nextPage,
        resetPagination,
      },
    }),
    [params, response, lastTimestamp, executeQuery, pageNumber, previousPage, nextPage, resetPagination],
  );
}

import { useCallback, useState } from 'react';

export interface UsePaginationResult {
  pageToken: string | undefined;
  setNextPageToken: (token: string | null | undefined) => void;
  pageNumber: number;
  resetPagination: () => void;
  previousPage: (() => void) | undefined;
  nextPage: (() => void) | undefined;
}

interface PaginationState {
  pageToken: string | undefined;
  nextPageToken: string | undefined;
  previousPageTokens: Array<string | undefined>;
}

export function usePagination(): UsePaginationResult {
  const [pagination, setPagination] = useState<PaginationState>({
    pageToken: undefined,
    nextPageToken: undefined,
    previousPageTokens: [],
  });

  const next = useCallback(() => {
    setPagination(({ pageToken, nextPageToken, previousPageTokens }) => ({
      pageToken: nextPageToken,
      nextPageToken: undefined,
      previousPageTokens: [pageToken, ...previousPageTokens],
    }));
  }, []);

  const prev = useCallback(() => {
    setPagination(({ previousPageTokens: [pageToken, ...rest], nextPageToken }) => ({
      pageToken,
      nextPageToken,
      previousPageTokens: rest,
    }));
  }, []);

  const setNextPageToken = useCallback((token: string | null | undefined) => {
    setPagination((p) => ({ ...p, nextPageToken: token ?? undefined }));
  }, []);

  const resetPagination = useCallback(() => {
    setPagination({ pageToken: undefined, nextPageToken: undefined, previousPageTokens: [] });
  }, []);

  return {
    pageToken: pagination.pageToken,
    setNextPageToken,
    pageNumber: pagination.previousPageTokens.length + 1,
    resetPagination,
    previousPage: pagination.previousPageTokens.length > 0 ? prev : undefined,
    nextPage: pagination.nextPageToken ? next : undefined,
  };
}

import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';

type Params = Record<string, any> | undefined;

export default function usePaginatedFetch<T>(path: string, initialParams?: Params, initialPage = 1, initialPageSize = 8) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [params, setParams] = useState<Params>(initialParams);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p = page, size = pageSize, pParams = params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(path, { params: { ...(pParams || {}), page: p, pageSize: size } });
      if (res.data && Array.isArray(res.data)) {
        setItems(res.data);
        setTotal(null);
      } else if (res.data && res.data.items) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setPage(res.data.page);
        setPageSize(res.data.pageSize);
      } else {
        setItems([]);
        setTotal(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  }, [path, page, pageSize, params]);

  useEffect(() => {
    // reset to first page when params change
    setPage(1);
    fetchPage(1, pageSize, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return {
    items,
    total,
    page,
    pageSize,
    params,
    setParams,
    setPage,
    setPageSize,
    loading,
    error,
    refresh: () => fetchPage(page, pageSize, params),
    fetchPage,
  } as const;
}

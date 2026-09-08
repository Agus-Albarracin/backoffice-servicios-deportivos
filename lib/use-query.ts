'use client';
import { useEffect, useRef, useState } from 'react';
export function useQuery<T>(key: string | null, loader: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>();
  const loaderRef = useRef(loader);
  useEffect(() => { loaderRef.current = loader; });
  const requestKey = key === null ? null : key + ':' + attempt;
  useEffect(() => {
    if (!requestKey) return;
    const controller = new AbortController();
    loaderRef.current(controller.signal).then(data => { if (!controller.signal.aborted) setResult({ key: requestKey, data }); }, error => { if (!controller.signal.aborted) setResult({ key: requestKey, error: error instanceof Error ? error.message : 'No se pudo cargar.' }); });
    return () => controller.abort();
  }, [requestKey]);
  const current = result?.key === requestKey ? result : undefined;
  return { data: current?.data, error: current?.error, loading: requestKey !== null && !current, retry: () => setAttempt(value => value + 1) };
}

import { useCallback, useEffect, useState } from 'react';

/**
 * Runs an async loader whenever `deps` change.
 * Returns { data, loading, error, reload, setData }.
 * `loading` is already true in the very first render after the deps change,
 * so pages never render stale / null data as if it were the new result.
 */
export default function useAsync(loader, deps = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);
  const [state, setState] = useState({ data: null, loading: true, error: null, for: null });

  const reload = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    run()
      .then((data) => !cancelled && setState({ data, loading: false, error: null, for: run }))
      .catch((error) => !cancelled && setState({ data: null, loading: false, error, for: run }));
    return () => { cancelled = true; };
  }, [run]);

  useEffect(() => reload(), [reload]);

  const setData = (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  const loading = state.loading || state.for !== run;
  return { data: state.data, loading, error: loading ? null : state.error, reload, setData };
}

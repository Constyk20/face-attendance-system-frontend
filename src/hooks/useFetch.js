import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../utils/format";

/**
 * Load data with loading / error state.
 *
 *   const { data, loading, error, reload } = useFetch(() => getDashboard().then(r => r.data), []);
 *
 * - `loading` is true on the first load and on every reload (show a skeleton
 *   only while `loading && !data` to avoid flicker on refresh).
 * - Results from a stale request are ignored (fast filter / page changes).
 * - Pass `{ enabled: false }` to skip fetching.
 */
export default function useFetch(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: "" });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState((current) => ({ ...current, loading: false }));
      return undefined;
    }
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: "" });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: errorMessage(err, "Could not load data"),
        }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const setData = useCallback(
    (updater) =>
      setState((current) => ({
        ...current,
        data: typeof updater === "function" ? updater(current.data) : updater,
      })),
    []
  );

  return { ...state, reload, setData };
}

import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

// Loads an API path and re-loads when it changes. Pass null to skip.
export function useLoad(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    const ctl = new AbortController();
    setError(null);
    api(path, { signal: ctl.signal }).then(setData).catch(e => e.name !== "AbortError" && setError(e));
    return () => ctl.abort();
  }, [path, tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  return { data, setData, error, reload };
}

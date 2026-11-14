"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { GenericResponse } from "@/model/model";

/** Pass a stable loader (an API method or a useCallback function). */
export default function useApiData<T>(load: (signal: AbortSignal) => Promise<GenericResponse<T>>) {
  const empty = { data: null, loading: true, error: "" };
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>(empty);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      ({ data }) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: "" });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState((current) => ({
            ...current, loading: false,
            error: error instanceof Error ? error.message : "Could not load employee data.",
          }));
        }
      },
    );
    return () => controller.abort();
  }, [load, revision]);

  // Activity hides pages without unmounting; the next visit starts a fresh read.
  useLayoutEffect(() => () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
  }, []);

  function retry() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setRevision((value) => value + 1);
  }

  return { ...state, retry };
}

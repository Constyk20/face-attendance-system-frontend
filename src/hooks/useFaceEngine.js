import { useCallback, useEffect, useState } from "react";
import { isFaceEngineReady, loadFaceEngine } from "../services/faceEngine";

/**
 * Loads the in-browser face models once per page load (they are cached by the
 * browser afterwards). status: "loading" | "ready" | "error".
 */
export default function useFaceEngine() {
  const [status, setStatus] = useState(isFaceEngineReady() ? "ready" : "loading");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (isFaceEngineReady()) {
      setStatus("ready");
      return undefined;
    }
    setStatus("loading");
    setError("");
    loadFaceEngine({ onProgress: (value) => !cancelled && setProgress(value) })
      .then(() => !cancelled && setStatus("ready"))
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "The face models could not be loaded.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { status, progress, error, retry };
}

import { Alert, Spinner } from "./ui";

/** Progress / error banner for the in-browser face models. Renders nothing when ready. */
export default function ModelStatus({ status, progress, error, onRetry }) {
  if (status === "ready") return null;
  if (status === "error") return <Alert onRetry={onRetry}>{error}</Alert>;
  const percent = Math.round(progress * 100);
  return (
    <div role="status" className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <div className="flex items-center gap-2">
        <Spinner className="h-4 w-4" />
        Loading face recognition model{percent > 0 ? ` (${percent}%)` : "..."}
      </div>
      <p className="mt-1 text-xs text-blue-700">One-time download (about 10 MB). It is stored in this browser for next time.</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.max(4, percent)}%` }} />
      </div>
    </div>
  );
}

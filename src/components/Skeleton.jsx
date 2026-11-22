// Skeleton loading blocks. All use Tailwind's built-in animate-pulse.

export function Skeleton({ className = "", style }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5" role="status" aria-label="Loading">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="overflow-hidden" role="status" aria-label="Loading table">
      <div className="mb-2 flex gap-4 border-b border-slate-200 px-2 pb-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 border-b border-slate-100 px-2 py-3">
          {Array.from({ length: columns }).map((_, column) => (
            <Skeleton
              key={column}
              className={`h-4 flex-1 ${column === 0 ? "max-w-[10rem]" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = "h-56" }) {
  return (
    <div role="status" aria-label="Loading chart">
      <div className={`flex ${height} items-end gap-3 px-2`}>
        {[40, 62, 50, 78, 66, 44, 70].map((value, index) => (
          <Skeleton key={index} className="flex-1 rounded-t-md" style={{ height: `${value}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page">
      <Skeleton className="mb-3 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-80" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <TableSkeleton rows={4} columns={4} />
      </div>
    </div>
  );
}

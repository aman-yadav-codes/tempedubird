export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page title skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-72 rounded-lg bg-muted" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-8 w-16 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Content block skeleton */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="h-5 w-36 rounded bg-muted" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-muted shrink-0" />
            <div className="h-3 rounded bg-muted" style={{ width: `${60 + i * 7}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

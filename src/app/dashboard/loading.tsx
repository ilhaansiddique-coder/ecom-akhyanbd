/**
 * Inner-content-only fallback. The dashboard sidebar + header live in
 * dashboard/layout.tsx and stay mounted across navigations, so we only
 * skeleton the page body.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-10 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-10 w-32 rounded-xl bg-gray-200 animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-100" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-gray-50"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-48 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="h-3.5 w-16 rounded bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-12 rounded bg-gray-100 animate-pulse" />
            <div className="h-6 w-14 rounded-full bg-gray-100 animate-pulse" />
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-lg bg-gray-100 animate-pulse" />
              <div className="w-6 h-6 rounded-lg bg-gray-100 animate-pulse" />
              <div className="w-6 h-6 rounded-lg bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

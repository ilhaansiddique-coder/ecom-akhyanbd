/**
 * Skeleton for /dashboard/orders — matches OrdersClient layout:
 *   - Filter bar (date + status + search)
 *   - Bulk-select bar placeholder
 *   - Table with rows (desktop) / cards (mobile)
 */
export default function OrdersLoading() {
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-10 w-32 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-10 w-32 rounded-xl bg-gray-200 animate-pulse" />
        <div className="flex-1 min-w-[180px] h-10 rounded-xl bg-gray-200 animate-pulse" />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="space-y-2 flex-1">
                <div className="h-3 w-12 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
              <div className="h-8 w-24 rounded-lg bg-gray-200 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-12 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-50">
            <div className="w-4 h-4 rounded bg-gray-200 animate-pulse shrink-0" />
            <div className="h-3.5 w-10 rounded bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="h-3.5 w-16 rounded bg-gray-200 animate-pulse ml-auto" />
            <div className="h-7 w-24 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
              <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton matching DashboardHomeClient layout:
 *   - 3 rows of 4 stat cards (col-2 mobile / xl:col-4)
 *   - 2 chart panels (lg:col-2)
 *   - Recent Orders + Top Products grid
 *   - Low Stock panel
 * Sidebar + header live in dashboard/layout.tsx and aren't skeletoned here.
 */
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
          <div className="h-5 w-16 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function ChartPanelSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
      <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
    </div>
  );
}

function ListPanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="h-4 w-36 rounded bg-gray-200 animate-pulse mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/5 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="h-3.5 w-14 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Row 1: Order Counts */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={`r1-${i}`} />)}
      </div>

      {/* Row 2: Revenue Breakdown */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={`r2-${i}`} />)}
      </div>

      {/* Row 3: Business Health */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={`r3-${i}`} />)}
      </div>

      {/* Charts: Bar (Last 7 Days) + Pie (Status Breakdown) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartPanelSkeleton />
        <ChartPanelSkeleton />
      </div>

      {/* Recent Orders + Top Products */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ListPanelSkeleton rows={6} />
        <ListPanelSkeleton rows={5} />
      </div>

      {/* Low Stock */}
      <ListPanelSkeleton rows={4} />
    </div>
  );
}

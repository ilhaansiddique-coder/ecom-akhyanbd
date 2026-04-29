"use client";

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header row */}
      <div className="flex gap-4 px-5 py-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-4 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 bg-gray-100 rounded flex-1" style={{ width: `${65 + ((r * 7 + c * 13) % 30)}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a single CombinedStatCard (count row + divider + revenue row) */
function CombinedStatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Count row */}
      <div className="flex items-center gap-3 p-4 md:p-5">
        <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-200 rounded w-14" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
      </div>
      {/* Divider */}
      <div className="mx-4 border-t border-gray-100" />
      {/* Revenue row */}
      <div className="flex items-center gap-3 p-4 md:p-5">
        <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-100 rounded w-28" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a table card (title + header row + data rows) */
function TableCardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      {/* Card title */}
      <div className="h-4 bg-gray-200 rounded w-32 mb-5" />
      {/* Table header */}
      <div className="flex gap-4 pb-2 mb-1 border-b border-gray-100">
        {[40, 80, 48, 60].map((w, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: w }} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2.5 border-b border-gray-50">
          {[40, 80, 48, 60].map((w, c) => (
            <div
              key={c}
              className="h-3 bg-gray-100 rounded"
              style={{ width: w * (0.7 + ((r * 0.1 + c * 0.05) % 0.35)) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full-page skeleton that mirrors the AdminDashboard layout */
export function StatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">

      {/* ── Date Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-4 h-4 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          {/* Preset buttons */}
          <div className="flex gap-2">
            {[56, 64, 72, 80, 64].map((w, i) => (
              <div key={i} className="h-7 bg-gray-100 rounded-lg" style={{ width: w }} />
            ))}
          </div>
          {/* Date inputs */}
          <div className="h-8 bg-gray-100 rounded-lg w-28" />
          <div className="h-8 bg-gray-100 rounded-lg w-28" />
        </div>
      </div>

      {/* ── Main combined stat cards (4 cols) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CombinedStatCardSkeleton key={i} />
        ))}
      </div>

      {/* ── Actual Sales section ── */}
      <div>
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-2 h-2 rounded-full bg-gray-200" />
          <div className="h-3 bg-gray-200 rounded w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CombinedStatCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm min-w-0">
          <div className="h-4 bg-gray-200 rounded w-36 mb-5" />
          {/* Chart area */}
          <div className="h-64 bg-gray-50 rounded-xl flex items-end gap-2 px-4 pb-4">
            {[55, 80, 45, 70, 90, 60, 75].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gray-200 rounded-t-md"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        {/* Pie chart card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm min-w-0">
          <div className="h-4 bg-gray-200 rounded w-36 mb-5" />
          <div className="h-64 flex items-center justify-center">
            <div className="w-44 h-44 rounded-full bg-gray-100 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tables row ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TableCardSkeleton rows={6} />
        <TableCardSkeleton rows={6} />
      </div>

    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

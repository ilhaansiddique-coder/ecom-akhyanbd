/**
 * Product page skeleton — pixel-matches the real page structure so the
 * swap-in is invisible (no layout shift, no jarring shape change).
 *
 * Shown by Next.js automatically while the route segment renders. Combined
 * with the NavigationProgress bar at the top, the user gets immediate
 * feedback on click + a structural placeholder that matches the destination.
 */

const Pulse = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

export default function ProductLoading() {
  return (
    <section className="py-8 md:py-12 bg-background-alt min-h-[70vh]">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Pulse className="h-4 w-12" />
          <span className="text-gray-300">/</span>
          <Pulse className="h-4 w-10" />
          <span className="text-gray-300">/</span>
          <Pulse className="h-4 w-32" />
        </div>

        {/* Gallery + details */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Gallery */}
          <div className="space-y-3">
            <Pulse className="aspect-square w-full rounded-2xl" />
            <div className="grid grid-cols-4 gap-2">
              <Pulse className="aspect-square rounded-lg" />
              <Pulse className="aspect-square rounded-lg" />
              <Pulse className="aspect-square rounded-lg" />
              <Pulse className="aspect-square rounded-lg" />
            </div>
          </div>

          {/* Details */}
          <div>
            <Pulse className="h-6 w-24 rounded-full mb-3" />
            <Pulse className="h-8 w-3/4 mb-2" />
            <Pulse className="h-8 w-1/2 mb-6" />

            <div className="flex items-center gap-3 mb-6">
              <Pulse className="h-9 w-28" />
              <Pulse className="h-6 w-20" />
              <Pulse className="h-7 w-24 rounded-lg" />
            </div>

            {/* Quantity / CTA row */}
            <div className="flex items-center gap-3 mb-4">
              <Pulse className="h-12 w-32 rounded-xl" />
              <Pulse className="h-12 flex-1 rounded-xl" />
            </div>
            <Pulse className="h-12 w-full rounded-xl mb-6" />

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              <Pulse className="h-12 rounded-xl" />
              <Pulse className="h-12 rounded-xl" />
              <Pulse className="h-12 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-10 bg-white rounded-2xl border border-border p-6 md:p-8">
          <Pulse className="h-6 w-32 mb-4" />
          <Pulse className="h-4 w-full mb-2" />
          <Pulse className="h-4 w-full mb-2" />
          <Pulse className="h-4 w-2/3" />
        </div>

        {/* Related */}
        <div className="mt-12">
          <Pulse className="h-6 w-40 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border overflow-hidden">
                <Pulse className="aspect-square w-full rounded-none" />
                <div className="p-3 space-y-2">
                  <Pulse className="h-4 w-3/4" />
                  <Pulse className="h-5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

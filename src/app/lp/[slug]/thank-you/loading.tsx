/**
 * Thank-you skeleton — matches the success card layout exactly so the
 * order details swap in without any layout shift.
 *
 * Shown while the route segment is loading (before client JS hydrates).
 * Once hydrated, the page itself shows an inline content skeleton while
 * the order API call is in flight.
 */
export default function ThankYouLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header — primary band stays solid (matches real header), skeleton sits below */}
          <div className="bg-primary text-white text-center py-8 px-6">
            <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="h-7 w-32 bg-white/20 rounded mx-auto" />
            <div className="h-4 w-56 bg-white/15 rounded mx-auto mt-3" />
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Order ID */}
            <div className="bg-gray-50 rounded-xl p-4 text-center space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded mx-auto animate-pulse" />
              <div className="h-7 w-28 bg-gray-200 rounded mx-auto animate-pulse" />
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
                  <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-primary/5 rounded-xl p-4 flex justify-between items-center">
              <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            </div>

            {/* Delivery info */}
            <div className="bg-yellow-50 rounded-xl p-4 space-y-2">
              <div className="h-4 w-3/4 bg-yellow-100 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-yellow-100 rounded animate-pulse" />
            </div>

            {/* Back link */}
            <div className="text-center pt-2">
              <div className="h-4 w-40 bg-gray-100 rounded mx-auto animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

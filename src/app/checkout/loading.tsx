export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-background-alt py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded-lg mx-auto animate-pulse" />
          <div className="h-4 w-80 bg-gray-100 rounded mx-auto mt-3 animate-pulse" />
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-10 space-y-6">
          {/* Cart items */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <div className="w-14 h-14 bg-gray-100 rounded-xl animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="w-8 h-6 bg-gray-100 rounded animate-pulse" />
                    <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Name + Phone */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-12 w-full bg-gray-100 rounded-xl animate-pulse" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
              <div className="h-12 w-full bg-gray-100 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-24 w-full bg-gray-100 rounded-xl animate-pulse" />
          </div>

          {/* Shipping zones */}
          <div className="space-y-2">
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 w-full bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* City */}
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-12 w-full bg-gray-100 rounded-xl animate-pulse" />
          </div>

          {/* Payment methods */}
          <div className="space-y-2">
            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-28 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="border-t-2 border-gray-200 pt-3 flex justify-between">
              <div className="h-6 w-16 bg-gray-300 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-300 rounded animate-pulse" />
            </div>
          </div>

          {/* Submit button */}
          <div className="h-14 w-full bg-gray-200 rounded-full animate-pulse" />

          {/* Trust badges */}
          <div className="flex justify-center gap-4">
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

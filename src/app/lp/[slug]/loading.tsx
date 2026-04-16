export default function LandingPageLoading() {
  return (
    <div className="min-h-screen bg-[#faf9f8]">
      {/* Hero */}
      <section className="pt-8 pb-8 md:pt-12 md:pb-10">
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center space-y-4">
          <div className="h-6 w-40 bg-gray-200 rounded-full mx-auto animate-pulse" />
          <div className="h-10 md:h-14 w-full max-w-xl bg-gray-200 rounded-lg mx-auto animate-pulse" />
          <div className="h-5 w-80 bg-gray-100 rounded mx-auto animate-pulse" />
          {/* Hero image */}
          <div className="aspect-video md:aspect-[21/9] bg-gray-100 rounded-3xl animate-pulse mt-6" />
          {/* CTA */}
          <div className="h-14 w-48 bg-gray-200 rounded-full mx-auto animate-pulse mt-4" />
          {/* Trust badges */}
          <div className="flex justify-center gap-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-28 bg-gray-100 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* Problem section */}
      <section className="py-8 md:py-10 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 md:px-8 text-center">
          <div className="h-8 w-56 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="h-1 w-20 bg-gray-200 rounded mx-auto mt-3 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-7 space-y-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl mx-auto animate-pulse" />
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-gray-100 rounded mx-auto animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-8 md:py-10">
        <div className="max-w-5xl mx-auto px-6 md:px-8 text-center">
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded mx-auto mt-3 animate-pulse" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden">
                <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-6 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-full bg-gray-200 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 md:py-10 bg-gray-800">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="h-10 w-64 bg-white/10 rounded mx-auto lg:mx-0 animate-pulse" />
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl shrink-0 animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-8 md:py-10">
        <div className="max-w-5xl mx-auto px-6 md:px-8 text-center">
          <div className="h-8 w-44 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => <div key={s} className="w-4 h-4 bg-gray-100 rounded animate-pulse" />)}
                </div>
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 md:py-10 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <div className="h-8 w-32 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 w-full bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* Checkout */}
      <section className="py-8 md:py-10 bg-gray-100">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <div className="bg-white rounded-3xl p-8 md:p-14 space-y-6">
            <div className="text-center">
              <div className="h-8 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
              <div className="h-4 w-80 bg-gray-100 rounded mx-auto mt-3 animate-pulse" />
            </div>
            {/* Form fields */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 h-14 bg-gray-100 rounded-xl animate-pulse" />
              <div className="flex-1 h-14 bg-gray-100 rounded-xl animate-pulse" />
            </div>
            <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            {/* Products */}
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
            {/* Shipping */}
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
            {/* Summary */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></div>
              <div className="flex justify-between"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /><div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /></div>
              <div className="border-t pt-3 flex justify-between"><div className="h-6 w-12 bg-gray-300 rounded animate-pulse" /><div className="h-6 w-20 bg-gray-300 rounded animate-pulse" /></div>
            </div>
            {/* Submit */}
            <div className="h-16 bg-gray-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  );
}

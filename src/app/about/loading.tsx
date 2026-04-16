export default function AboutLoading() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary">
        <div className="container mx-auto px-4 py-16 md:py-20 text-center">
          <div className="h-6 w-44 bg-white/15 rounded-full mx-auto" />
          <div className="h-12 w-64 bg-white/15 rounded-lg mx-auto mt-4" />
          <div className="h-4 w-96 max-w-full bg-white/10 rounded mx-auto mt-4" />
        </div>
      </section>

      {/* Mission + Stats */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="h-8 w-40 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="h-4 w-full max-w-lg bg-gray-100 rounded mx-auto mt-4 animate-pulse" />
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 space-y-2">
                <div className="h-10 w-16 bg-gray-200 rounded mx-auto animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded mx-auto animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 md:py-20 bg-background-alt">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <div className="h-6 w-36 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-8 w-72 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="bg-gray-100 rounded-2xl p-8 space-y-4">
              <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto animate-pulse" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-14 bg-gray-200 rounded-lg animate-pulse shrink-0" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="h-8 w-56 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-3">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl mx-auto animate-pulse" />
                <div className="h-5 w-24 bg-gray-200 rounded mx-auto animate-pulse" />
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-gray-100 rounded mx-auto animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-20 bg-primary">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <div className="h-8 w-32 bg-white/15 rounded mx-auto" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-6 space-y-3">
                <div className="w-16 h-16 bg-white/20 rounded-full mx-auto" />
                <div className="h-4 w-24 bg-white/15 rounded mx-auto" />
                <div className="h-3 w-16 bg-white/10 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

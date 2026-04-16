export default function HomeLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="bg-primary">
        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <div className="h-6 w-40 bg-white/15 rounded-full" />
              <div className="h-12 w-80 bg-white/15 rounded-lg" />
              <div className="h-8 w-64 bg-white/10 rounded-lg" />
              <div className="h-16 w-full max-w-lg bg-white/10 rounded-lg" />
              <div className="flex gap-4 pt-4">
                <div className="h-12 w-36 bg-white/20 rounded-xl" />
                <div className="h-12 w-36 bg-white/10 rounded-xl" />
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="w-80 h-80 xl:w-96 xl:h-96 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories skeleton */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="h-8 w-32 bg-gray-200 rounded mx-auto animate-pulse" />
            <div className="h-4 w-56 bg-gray-100 rounded mx-auto mt-4 animate-pulse" />
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="h-4 w-16 bg-gray-100 rounded mt-3 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products skeleton */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="h-8 w-44 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-56 bg-gray-100 rounded mt-4 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="aspect-square bg-gray-100 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews skeleton */}
      <section className="py-12 md:py-16 bg-background-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="h-8 w-44 bg-gray-200 rounded mx-auto animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded mx-auto mt-4 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                    <div className="flex gap-1">{[1,2,3,4,5].map(s=><div key={s} className="w-4 h-4 bg-gray-100 rounded animate-pulse" />)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features skeleton */}
      <section className="py-12 md:py-16 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/15 rounded-2xl mx-auto" />
                <div className="h-4 w-24 bg-white/15 rounded mx-auto mt-4" />
                <div className="h-3 w-32 bg-white/10 rounded mx-auto mt-2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

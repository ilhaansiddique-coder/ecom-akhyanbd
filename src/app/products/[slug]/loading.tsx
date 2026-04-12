export default function ProductLoading() {
  return (
    <section className="py-8 md:py-12 bg-background-alt min-h-[70vh]">
      <div className="container mx-auto px-4">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-2 bg-gray-100 rounded" />
          <div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-2 bg-gray-100 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Image skeleton */}
          <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />

          {/* Details skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-8 w-3/4 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-12 w-full bg-gray-100 rounded-xl animate-pulse mt-4" />
            <div className="h-12 w-full bg-gray-200 rounded-xl animate-pulse" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

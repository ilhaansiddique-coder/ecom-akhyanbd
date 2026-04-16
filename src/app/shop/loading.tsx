export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-background-alt">
      <div className="container mx-auto px-4 py-8">
        {/* Header: title + count + search */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-100 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-full md:w-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 overflow-hidden w-full md:w-auto">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-24 bg-gray-200 rounded-full animate-pulse shrink-0" />
            ))}
          </div>
          <div className="h-9 w-36 bg-gray-200 rounded-xl animate-pulse shrink-0" />
        </div>

        {/* Product grid — 1 col mobile, 2 sm, 3 md, 4 lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="aspect-square bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-10 w-10 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

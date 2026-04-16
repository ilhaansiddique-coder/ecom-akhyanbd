export default function ContactLoading() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary">
        <div className="container mx-auto px-4 py-16 md:py-20 text-center">
          <div className="h-6 w-48 bg-white/15 rounded-full mx-auto" />
          <div className="h-12 w-56 bg-white/15 rounded-lg mx-auto mt-4" />
          <div className="h-4 w-80 bg-white/10 rounded mx-auto mt-4" />
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Form (2 cols) */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 md:p-8 space-y-5">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              {/* Name + Email row */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-11 w-full bg-gray-100 rounded-xl animate-pulse" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-11 w-full bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
              {/* Phone + Subject */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-11 w-full bg-gray-100 rounded-xl animate-pulse" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
                  <div className="h-11 w-full bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
              {/* Message */}
              <div className="space-y-2">
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-32 w-full bg-gray-100 rounded-xl animate-pulse" />
              </div>
              {/* Submit */}
              <div className="h-11 w-32 bg-gray-200 rounded-xl animate-pulse" />
            </div>

            {/* Sidebar (1 col) */}
            <div className="space-y-6">
              {/* Contact info card */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
                <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl animate-pulse shrink-0" />
                    <div className="space-y-1 flex-1">
                      <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Social media card */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
              {/* Map */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="h-48 bg-gray-100 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

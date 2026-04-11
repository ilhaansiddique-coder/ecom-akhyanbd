"use client";

import dynamic from "next/dynamic";

const CustomerReviews = dynamic(() => import("./CustomerReviews"), {
  loading: () => (
    <section className="py-12 md:py-16 bg-background-alt">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground section-heading">গ্রাহকদের মতামত</h2>
          <p className="text-text-muted mt-4">আমাদের সম্মানিত গ্রাহকদের মতামত</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-border shadow-sm h-40 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  ),
  ssr: false,
});

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  review: string;
  product_name?: string;
}

export default function LazyCustomerReviews({ reviews }: { reviews?: Review[] }) {
  return <CustomerReviews reviews={reviews} />;
}

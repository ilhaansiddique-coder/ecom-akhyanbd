"use client";

import { useState } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "@/data/products";
import { useLang } from "@/lib/LanguageContext";
import { mapApiProduct } from "@/data/products";

interface AllProductsProps {
  initialProducts: Product[];
  total: number;
}

export default function AllProducts({ initialProducts, total }: AllProductsProps) {
  const { lang } = useLang();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const hasMore = products.length < total;

  const loadMore = async () => {
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/v1/products?per_page=${perPage}&page=${nextPage}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60, tags: ["products"] },
      } as RequestInit);
      const json = await res.json();
      const data = json.data || json;
      if (Array.isArray(data) && data.length > 0) {
        setProducts((prev) => [...prev, ...data.map(mapApiProduct)]);
        setPage(nextPage);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
            {lang === "en" ? "Trending For Your Little One" : "আপনার ছোট্ট সোনামণির জন্য"}
          </h2>
          <p className="text-text-muted mt-2 text-sm md:text-base">
            {lang === "en" ? "Soft cotton outfits for newborn to 12 years" : "নবজাতক থেকে ১২ বছর — নরম সুতির পোশাক"}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < 4} />
          ))}
        </div>

        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {loading
                ? (lang === "en" ? "Loading..." : "লোড হচ্ছে...")
                : (lang === "en" ? "See More" : "আরো দেখুন →")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import { FiSearch, FiFrown } from "react-icons/fi";
import { api } from "@/lib/api";
import { mapApiProduct, type Product } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import { useLang } from "@/lib/LanguageContext";
import { toBn } from "@/utils/toBn";

export default function SearchClient({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = use(searchParams);
  const q = params.q || "";
  const { lang } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api.searchProducts(q)
      .then((res) => {
        const data = res.data || res;
        if (Array.isArray(data)) {
          setProducts(data.map(mapApiProduct));
        }
      })
      .finally(() => setLoading(false));
  }, [q]);

  const en = lang === "en";

  return (
    <section className="py-12 bg-background-alt min-h-[70vh]">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {en ? "Search Results" : "অনুসন্ধানের ফলাফল"}
          </h1>
          <p className="text-text-muted mt-2">
            {en ? `Showing results for "${q}"` : `"${q}" এর জন্য ফলাফল দেখানো হচ্ছে`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-border">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiFrown className="w-10 h-10 text-text-muted" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              {en ? "No products found" : "কোনো পণ্য পাওয়া যায়নি"}
            </h2>
            <p className="text-text-muted max-w-md mx-auto mb-8">
              {en 
                ? "Try checking your spelling or use more general terms." 
                : "অনুগ্রহ করে বানান চেক করুন অথবা সাধারণ শব্দ ব্যবহার করে পুনরায় চেষ্টা করুন।"}
            </p>
            <div className="relative max-w-md mx-auto">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <form action="/search" method="GET">
                  <input 
                    name="q"
                    defaultValue={q}
                    type="text" 
                    placeholder={en ? "Search again..." : "আবার খুঁজুন..."}
                    className="w-full pl-12 pr-4 py-4 bg-background-alt border border-border rounded-2xl focus:outline-none focus:border-primary transition-colors"
                  />
                </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

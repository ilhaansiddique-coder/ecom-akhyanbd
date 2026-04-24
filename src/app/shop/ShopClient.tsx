"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import { mapApiProduct } from "@/data/products";
import type { Product } from "@/data/products";
import { api } from "@/lib/api";
import InlineSelect from "@/components/InlineSelect";
import { useLang } from "@/lib/LanguageContext";
import { toBn } from "@/utils/toBn";
import { useChannel } from "@/lib/useChannel";

type SortOption = "default" | "price_asc" | "price_desc" | "newest" | "popular";

interface ShopClientProps {
  initialProducts: Product[];
  initialTotal: number;
  pageSize: number;
  apiCategories: { id: number; name: string; slug: string }[];
}

export default function ShopClient({ initialProducts, initialTotal, pageSize, apiCategories }: ShopClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useLang();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeBrand, setActiveBrand] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("default");

  // Read URL params on mount: ?category=ID or ?brand=ID
  useEffect(() => {
    const catId = searchParams.get("category");
    const brandId = searchParams.get("brand");

    if (catId) {
      const cat = apiCategories.find((c) => String(c.id) === catId);
      if (cat) setActiveCategory(cat.slug);
    }
    if (brandId) {
      setActiveBrand(brandId);
    }
  }, [searchParams, apiCategories]);

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(slug);
    setActiveBrand("");
    // Update URL without reload
    if (slug === "all") {
      router.push("/shop", { scroll: false });
    } else {
      const cat = apiCategories.find((c) => c.slug === slug);
      if (cat) router.push(`/shop?category=${cat.id}`, { scroll: false });
    }
  };

  // Build query string with current filters
  const buildQuery = useCallback((pageNum: number, perPage: number) => {
    const parts = [`page=${pageNum}`, `per_page=${perPage}`];
    if (activeCategory !== "all") {
      const cat = apiCategories.find((c) => c.slug === activeCategory);
      if (cat) parts.push(`category_id=${cat.id}`);
    }
    if (activeBrand) parts.push(`brand_id=${activeBrand}`);
    return parts.join("&");
  }, [activeCategory, activeBrand, apiCategories]);

  const reloadProducts = useCallback(() => {
    // Refetch from page 1 with current loaded count to keep grid stable
    const perPage = Math.max(pageSize, products.length);
    api.getProducts(buildQuery(1, perPage))
      .then((res) => {
        const data = res.data || res;
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map(mapApiProduct));
          if (typeof res.total === "number") setTotal(res.total);
        }
      })
      .catch(() => {});
  }, [pageSize, products.length, buildQuery]);

  // Real-time: auto-refresh shop when admin changes a product
  useChannel("products", ".product.changed", () => { reloadProducts(); });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingMore || products.length >= total) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.getProducts(buildQuery(nextPage, pageSize));
      const data = res.data || res;
      if (Array.isArray(data) && data.length > 0) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = data.map(mapApiProduct).filter((p: Product) => !existingIds.has(p.id));
          return [...prev, ...newOnes];
        });
        setPage(nextPage);
        if (typeof res.total === "number") setTotal(res.total);
      } else {
        // No more results — sync total to current loaded count to hide button
        setTotal(products.length);
      }
    } catch {} finally {
      setLoadingMore(false);
    }
  }, [loadingMore, products.length, total, page, pageSize, buildQuery]);

  // When category/brand changes, refetch from server with filter applied
  // Skip on initial mount (SSR already loaded global page 1)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    let cancelled = false;
    setLoadingMore(true);
    api.getProducts(buildQuery(1, pageSize))
      .then((res) => {
        if (cancelled) return;
        const data = res.data || res;
        const list = Array.isArray(data) ? data.map(mapApiProduct) : [];
        setProducts(list);
        setPage(1);
        setTotal(typeof res.total === "number" ? res.total : list.length);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingMore(false); });
    return () => { cancelled = true; };
  }, [activeCategory, activeBrand, buildQuery, pageSize]);

  // Auto-load more on scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (products.length >= total) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, products.length, total]);

  // Build category list from API categories
  const categoryButtons = [
    { name: lang === "en" ? "All Products" : "সকল পণ্য", slug: "all" },
    ...apiCategories.map((c) => ({ name: c.name, slug: c.slug })),
  ];

  // Category + brand filters now handled server-side via API params.
  // Keep client-side sort.
  let filtered = products;
  if (sort === "price_asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === "price_desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sort === "newest") filtered = [...filtered].sort((a, b) => b.id - a.id);
  if (sort === "popular") filtered = [...filtered].sort((a, b) => (b.originalPrice ? 1 : 0) - (a.originalPrice ? 1 : 0));

  return (
    <section className="py-8 md:py-12 bg-background-alt min-h-[70vh]">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{lang === "en" ? "All Products" : "সকল পণ্য"}</h1>
              <p className="text-text-muted text-sm mt-1" suppressHydrationWarning>
                {lang === "en" ? `${filtered.length} products found` : `${toBn(filtered.length)}টি পণ্য পাওয়া গেছে`}
              </p>
            </div>
          </div>

          {/* Filters + Sort */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {categoryButtons.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.slug ? "bg-primary text-white" : "bg-white text-foreground border border-border hover:border-primary hover:text-primary"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <InlineSelect value={sort} options={[
              { value: "default", label: lang === "en" ? "Default" : "ডিফল্ট সর্টিং" },
              { value: "price_asc", label: lang === "en" ? "Price: Low → High" : "দাম: কম → বেশি" },
              { value: "price_desc", label: lang === "en" ? "Price: High → Low" : "দাম: বেশি → কম" },
              { value: "newest", label: lang === "en" ? "Newest" : "নতুন পণ্য" },
              { value: "popular", label: lang === "en" ? "Popular" : "জনপ্রিয়" },
            ]} onChange={(v) => setSort(v as SortOption)} />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filtered.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              <p className="text-lg">{lang === "en" ? "No products found" : "কোনো পণ্য পাওয়া যায়নি"}</p>
              <button onClick={() => { setActiveCategory("all"); }} className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors">
                {lang === "en" ? "View All Products" : "সব পণ্য দেখুন"}
              </button>
            </div>
          )}

          {/* Infinite scroll sentinel + status */}
          {products.length < total && (
            <div ref={sentinelRef} className="flex flex-col items-center mt-10 gap-2 py-6">
              {loadingMore && (
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              <p className="text-xs text-text-muted" suppressHydrationWarning>
                {lang === "en"
                  ? `Showing ${products.length} of ${total}`
                  : `${toBn(products.length)} / ${toBn(total)} টি দেখানো হচ্ছে`}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

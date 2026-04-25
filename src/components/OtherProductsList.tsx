"use client";

/**
 * Infinite-scroll grid for the "Other Products" strip on a product detail
 * page. Receives the first page from the server (so first paint is fast,
 * SEO-indexable, and loads zero JS for the cards themselves) then uses an
 * IntersectionObserver on a sentinel element to fetch successive pages of
 * 20 products each as the user scrolls.
 *
 * Stops loading when the API returns fewer than `perPage` items — that's
 * the "no more pages" signal. Avoids a separate count query.
 */
import { useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { mapApiProduct, type Product } from "@/data/products";
import { useLang } from "@/lib/LanguageContext";

interface Props {
  initial: Product[];
  excludeCategoryId: number;
  excludeId: number;
  perPage?: number;
}

export default function OtherProductsList({
  initial,
  excludeCategoryId,
  excludeId,
  perPage = 20,
}: Props) {
  const { lang } = useLang();
  const [items, setItems] = useState<Product[]>(initial);
  // Page state — page 1 came from SSR, so the next fetch starts at page 2.
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  // `hasMore` flips false the moment a fetch returns < perPage items.
  // initial.length < perPage means SSR already exhausted the catalog.
  const [hasMore, setHasMore] = useState(initial.length === perPage);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Guards against the observer firing twice for the same page when the
  // sentinel re-enters the viewport during React's render commit.
  const inflightPage = useRef<number | null>(null);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (loading) return;
        if (inflightPage.current === page) return;
        inflightPage.current = page;
        loadMore();
      },
      // Start loading 600px before the sentinel hits the viewport so the
      // user never sees an empty whitespace gap while we fetch.
      { rootMargin: "600px 0px" },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, page]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        exclude_category_id: String(excludeCategoryId),
        exclude_id: String(excludeId),
        sort_by: "sold_count",
        sort_dir: "desc",
      });
      const res = await fetch(`/api/v1/products?${qs.toString()}`, {
        cache: "force-cache",
      });
      const json = await res.json();
      // Server returns { data: [...], meta: {...} } via paginatedResponse.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const mapped = raw.map((r) => mapApiProduct(r));
      // Defensive de-dupe by id — paranoid guard against the same row
      // appearing in two adjacent pages if the sort tie-broke inconsistently.
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...mapped.filter((p) => !seen.has(p.id))];
      });
      if (mapped.length < perPage) setHasMore(false);
      else setPage((p) => p + 1);
    } catch {
      // Silent — leave hasMore alone so the user can scroll back and retry
      // if the network blips.
    } finally {
      setLoading(false);
      inflightPage.current = null;
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* Loader strip — visible only while a fetch is in flight. */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mt-3 sm:mt-4 md:mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="aspect-square w-full bg-gray-200 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sentinel: when this enters the viewport, we kick off the next page. */}
      {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}

      {/* End-of-list marker — bilingual copy mirrors the section header. */}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-6">
          {lang === "en" ? "You've seen everything ✨" : "সব দেখা শেষ ✨"}
        </p>
      )}
    </>
  );
}

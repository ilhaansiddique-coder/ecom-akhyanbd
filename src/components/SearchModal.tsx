"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiX } from "react-icons/fi";
import Link from "next/link";
import { SafeNextImage } from "@/components/SafeImage";
import { toBn } from "@/utils/toBn";
import { trackSearch } from "@/lib/analytics";

const API_URL = "/api/v1";

interface SearchResult {
  id: number;
  name: string;
  slug: string;
  price: number | string;
  image?: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.data || [];
        setResults(items);
        if (items.length > 0) trackSearch({ search_string: q });
      }
    } catch {}
    setLoading(false);
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    doSearch(tag);
    inputRef.current?.focus();
  };

  const makeSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed top-0 left-0 right-0 z-[61] bg-white shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleInput(e.target.value)}
                    placeholder="পণ্য খুঁজুন..."
                    className="w-full pl-12 pr-4 py-4 text-lg border-2 border-border rounded-xl focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <button onClick={onClose} className="p-3 hover:bg-background-alt rounded-full transition-colors text-foreground" aria-label="বন্ধ করুন">
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Results */}
              {loading && (
                <div className="mt-4 space-y-2 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                        <div className="h-3.5 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-text-muted">{toBn(results.length)}টি ফলাফল পাওয়া গেছে</p>
                  {results.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug || makeSlug(p.name)}`}
                      onClick={onClose}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-background-alt transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-background-alt overflow-hidden shrink-0 relative">
                        {p.image ? (
                          <SafeNextImage src={p.image || "/placeholder.svg"} alt={p.name} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <FiSearch className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-sm text-primary font-bold">৳{toBn(Number(p.price))}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-center text-text-muted py-8">কোনো পণ্য পাওয়া যায়নি</p>
              )}

              {/* Quick suggestions */}
              {query.length === 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-sm text-text-muted mr-2">জনপ্রিয়:</span>
                  {["ভেষজ চা", "বিটরুট", "সজনে পাতা", "মেথি", "হার্ট কেয়ার", "মেহেদী"].map((tag) => (
                    <button key={tag} onClick={() => handleTagClick(tag)} className="px-3 py-1.5 text-sm bg-background-alt hover:bg-primary/10 hover:text-primary rounded-full transition-colors">
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useRef } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import MotionFadeIn from "./MotionFadeIn";
import LiveRefresh from "./LiveRefresh";
import T from "./T";
import { SafeImg } from "./SafeImage";

interface CategoryItem {
  id?: number;
  name: string;
  slug: string;
  image?: string | null;
  products_count?: number;
  emoji?: string;
  color?: string;
}

interface CategoriesProps {
  categories: CategoryItem[];
}

// Category placeholder SVGs for categories without images
const placeholderEmojis: Record<string, string> = {
  "🌿": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z",
  "🍵": "M2 19h18v2H2zm2-2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2z",
  "❤️": "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
};

export default function Categories({ categories }: CategoriesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 280;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <MotionFadeIn className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground section-heading">
            <T k="categories.title" />
          </h2>
          <p className="text-text-muted mt-4"><T k="categories.subtitle" /></p>
        </MotionFadeIn>

        <LiveRefresh channel="categories" event=".category.changed">
          <div className="relative group/carousel">
            {/* Left arrow */}
            <button
              type="button"
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition-all opacity-0 group-hover/carousel:opacity-100 -translate-x-2 group-hover/carousel:translate-x-0 duration-200"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            {/* Right arrow */}
            <button
              type="button"
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition-all opacity-0 group-hover/carousel:opacity-100 translate-x-2 group-hover/carousel:translate-x-0 duration-200"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>

            {/* Scrollable row */}
            <div
              ref={scrollRef}
              className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide scroll-smooth px-1 py-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {categories.map((cat) => {
                const href = cat.slug === "all"
                  ? "/shop"
                  : cat.id
                  ? `/shop?category=${cat.id}`
                  : `/shop?category=${cat.slug}`;

                return (
                  <Link
                    key={cat.slug}
                    href={href}
                    className="group flex flex-col items-center text-center shrink-0 w-28 md:w-36"
                  >
                    {/* Image container */}
                    <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-primary group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ${!cat.image ? `bg-gradient-to-br ${cat.color || "from-gray-50 to-gray-100"}` : ""}`}>
                      {cat.image ? (
                        <SafeImg
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform duration-300">
                            {cat.emoji || "📦"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="mt-3 text-xs md:text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {cat.name}
                    </h3>

                    {/* Product count */}
                    {cat.products_count !== undefined && cat.products_count > 0 && (
                      <span className="text-[10px] text-text-muted mt-0.5">
                        {cat.products_count}টি পণ্য
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </LiveRefresh>
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}

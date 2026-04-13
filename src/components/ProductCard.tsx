"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SafeNextImage } from "@/components/SafeImage";
import { FiShoppingCart, FiCheck, FiShoppingBag } from "react-icons/fi";
import type { Product } from "@/data/products";
import { toBn } from "@/utils/toBn";
import { useCart } from "@/lib/CartContext";
import { useLang } from "@/lib/LanguageContext";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { t, lang } = useLang();
  const router = useRouter();
  const [showAdded, setShowAdded] = useState(false);
  const displayName = product.nameBn || product.name;
  const { originalPrice, image: rawImage, badge, badgeColor = "bg-primary" } = product;
  const hasVar = !!(product.hasVariations || (product.variants && product.variants.length > 0));
  const lowestVariantPrice = hasVar ? Math.min(...product.variants!.map(v => v.price)) : product.price;
  const highestVariantPrice = hasVar ? Math.max(...product.variants!.map(v => v.price)) : product.price;
  const price = hasVar ? lowestVariantPrice : product.price;
  const image = rawImage || "/placeholder.svg";
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleAddToCart = () => {
    if (hasVar) { router.push(`/products/${slug}`); return; }
    addItem({ id: product.id, name: displayName, price, image });
    setShowAdded(true);
  };

  const handleOrderNow = () => {
    if (hasVar) { router.push(`/products/${slug}`); return; }
    addItem({ id: product.id, name: displayName, price, image });
    router.push("/checkout");
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-border overflow-hidden group shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
        <Link href={`/products/${slug}`} className="block">
          <div className="relative overflow-hidden aspect-square bg-background-alt">
            <SafeNextImage
              src={image}
              alt={displayName}
              fill
              sizes="(max-width: 639px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
              quality={75}
            />

            {badge && (
              <span className={`absolute top-3 left-3 ${badgeColor} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md`}>
                {badge}
              </span>
            )}

            {discount > 0 && !badge && (
              <span className="absolute top-3 left-3 bg-sale-red text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-md" suppressHydrationWarning>
                -{toBn(discount)}%
              </span>
            )}


            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
          </div>
        </Link>

        <div className="p-4 flex flex-col flex-1">
          <Link href={`/products/${slug}`} className="flex-1">
            <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {displayName}
            </h3>
          </Link>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-primary text-lg" suppressHydrationWarning>
              ৳{toBn(price)}{hasVar && highestVariantPrice > lowestVariantPrice && <> - ৳{toBn(highestVariantPrice)}</>}
            </span>
            {!hasVar && originalPrice && (
              <span className="text-text-light line-through text-sm" suppressHydrationWarning>৳{toBn(originalPrice)}</span>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleOrderNow}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FiShoppingBag className="w-4 h-4" />
              <span>{t("product.order")}</span>
            </button>
            <button
              onClick={handleAddToCart}
              className="py-2.5 px-3 border-2 border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center cursor-pointer"
              title={lang === "en" ? "Add to Cart" : "কার্টে যোগ করুন"}
            >
              <FiShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Added to Cart Popup — Portal to body */}
      {showAdded && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAdded(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <FiCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {lang === "en" ? "Added to Cart!" : "কার্টে যোগ হয়েছে!"}
              </h3>
              <p className="text-sm text-gray-500 mb-5 line-clamp-1">{displayName}</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowAdded(false)}
                  className="flex-1 py-2.5 border-2 border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  {lang === "en" ? "Continue Shopping" : "আরো কিনুন"}
                </button>
                <button
                  onClick={() => { setShowAdded(false); router.push("/checkout"); }}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors cursor-pointer"
                >
                  {lang === "en" ? "Checkout" : "চেকআউট"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

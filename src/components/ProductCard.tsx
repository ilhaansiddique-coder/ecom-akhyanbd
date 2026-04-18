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
import { useOption } from "@/lib/SiteSettingsContext";
import { trackAddToCart } from "@/lib/analytics";

// Style classnames per card variant — applied to the outer wrapper.
const CARD_STYLES: Record<string, string> = {
  shadowed: "bg-white rounded-2xl border border-border shadow-sm hover:shadow-xl hover:-translate-y-1.5",
  bordered: "bg-white rounded-2xl border-2 border-border hover:border-primary",
  minimal:  "bg-transparent rounded-2xl border-0 hover:bg-background-alt/40",
  overlay:  "bg-white rounded-2xl border border-border shadow-sm hover:shadow-lg",
};

// Per-style button rendering (handled inline via shape/style options below).
function buttonClass(style: string, shape: string, disabled: boolean): string {
  const radius =
    shape === "pill" ? "rounded-full" :
    shape === "square" ? "rounded-md" :
    "rounded-xl";
  if (disabled) return `${radius} bg-gray-200 text-gray-400 cursor-not-allowed`;
  switch (style) {
    case "outline":
      return `${radius} border-2 border-primary text-primary hover:bg-primary/5`;
    case "gradient":
      return `${radius} text-white bg-gradient-to-r from-primary via-primary-light to-primary-dark hover:opacity-90`;
    case "soft":
      return `${radius} bg-primary/10 text-primary hover:bg-primary/15`;
    case "solid":
    default:
      return `${radius} bg-primary text-white hover:bg-primary-light`;
  }
}

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { t, lang } = useLang();
  const router = useRouter();
  const [showAdded, setShowAdded] = useState(false);

  // Customizer-driven options
  const cardStyle      = useOption<string>("card.style");
  const buttonStyle    = useOption<string>("button.style");
  const buttonShape    = useOption<string>("button.shape");
  const customCtaText  = useOption<string>("card.cta_text");
  const showBadge      = useOption<boolean>("card.show.badge");
  const showDiscount   = useOption<boolean>("card.show.discount");
  const showOriginal   = useOption<boolean>("card.show.original_price");
  const showStock      = useOption<boolean>("card.show.stock");
  const showCartBtn    = useOption<boolean>("card.show.cart_button");
  const displayName = product.nameBn || product.name;
  const { originalPrice, image: rawImage, badge, badgeColor = "bg-primary" } = product;
  const hasVar = !!(product.hasVariations || (product.variants && product.variants.length > 0));
  const lowestVariantPrice = hasVar ? Math.min(...product.variants!.map(v => v.price)) : product.price;
  const highestVariantPrice = hasVar ? Math.max(...product.variants!.map(v => v.price)) : product.price;
  const price = hasVar ? lowestVariantPrice : product.price;
  const image = rawImage || "/placeholder.svg";
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Stock checks
  const isUnlimited = product.unlimitedStock;
  const stock = product.stock ?? 0;
  const isOutOfStock = !isUnlimited && !hasVar && stock <= 0;
  const isLowStock = !isUnlimited && !hasVar && stock > 0 && stock <= 5;
  // For variable products: check if all variants are out of stock
  const allVariantsOut = hasVar && product.variants?.every(v => !v.unlimited_stock && v.stock <= 0);
  const productOutOfStock = Boolean(isOutOfStock || allVariantsOut);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleAddToCart = () => {
    if (productOutOfStock) return;
    if (hasVar) { router.push(`/products/${slug}`); return; }
    addItem({ id: product.id, name: displayName, price, image, stock: isUnlimited ? undefined : stock, unlimitedStock: isUnlimited });
    trackAddToCart({ content_ids: [product.id], content_name: displayName, value: price });
    setShowAdded(true);
  };

  const handleOrderNow = () => {
    if (productOutOfStock) return;
    if (hasVar) { router.push(`/products/${slug}`); return; }
    addItem({ id: product.id, name: displayName, price, image, stock: isUnlimited ? undefined : stock, unlimitedStock: isUnlimited });
    trackAddToCart({ content_ids: [product.id], content_name: displayName, value: price });
    router.push("/checkout");
  };

  return (
    <>
      <div className={`overflow-hidden group transition-all duration-300 flex flex-col h-full ${CARD_STYLES[cardStyle] || CARD_STYLES.shadowed}`}>
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

            {showBadge && badge && (
              <span className={`absolute top-3 left-3 ${badgeColor} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md`}>
                {badge}
              </span>
            )}

            {showDiscount && discount > 0 && !badge && (
              <span className="absolute top-3 left-3 bg-sale-red text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-md" suppressHydrationWarning>
                -{toBn(discount)}%
              </span>
            )}


            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
          </div>
        </Link>

        <div className="p-3 sm:p-4 flex flex-col flex-1">
          <Link href={`/products/${slug}`} className="flex-1">
            <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {displayName}
            </h3>
          </Link>

          <div className="mt-2 sm:mt-3 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-primary text-base sm:text-lg" suppressHydrationWarning>
              ৳{toBn(price)}{hasVar && highestVariantPrice > lowestVariantPrice && <> - ৳{toBn(highestVariantPrice)}</>}
            </span>
            {showOriginal && !hasVar && originalPrice && (
              <span className="text-text-light line-through text-xs sm:text-sm" suppressHydrationWarning>৳{toBn(originalPrice)}</span>
            )}
          </div>

          {/* Stock indicator */}
          {showStock && !isUnlimited && !hasVar && (
            <div className="mt-1.5">
              {productOutOfStock ? (
                <span className="text-xs font-semibold text-red-500">{lang === "en" ? "Out of Stock" : "স্টক শেষ"}</span>
              ) : isLowStock ? (
                <span className="text-xs font-medium text-amber-600">{lang === "en" ? `Only ${stock} left` : `মাত্র ${toBn(stock)}টি বাকি`}</span>
              ) : (
                <span className="text-xs text-gray-400">{lang === "en" ? `${stock} in stock` : `${toBn(stock)}টি স্টকে আছে`}</span>
              )}
            </div>
          )}
          {showStock && hasVar && allVariantsOut && (
            <div className="mt-1.5">
              <span className="text-xs font-semibold text-red-500">{lang === "en" ? "Out of Stock" : "স্টক শেষ"}</span>
            </div>
          )}

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleOrderNow}
              disabled={productOutOfStock}
              className={`w-full sm:flex-1 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors ${buttonClass(buttonStyle, buttonShape, productOutOfStock)}`}
            >
              <FiShoppingBag className="w-4 h-4" />
              <span>{productOutOfStock ? (lang === "en" ? "Out of Stock" : "স্টক শেষ") : (customCtaText || t("product.order"))}</span>
            </button>
            {showCartBtn && !productOutOfStock && (
              <button
                onClick={handleAddToCart}
                className={`w-full sm:w-auto py-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border-2 border-primary text-primary hover:bg-primary/5 ${buttonShape === "pill" ? "rounded-full" : buttonShape === "square" ? "rounded-md" : "rounded-xl"}`}
                title={lang === "en" ? "Add to Cart" : "কার্টে যোগ করুন"}
              >
                <FiShoppingCart className="w-4 h-4" />
                <span className="sm:hidden">{lang === "en" ? "Add to Cart" : "কার্টে যোগ করুন"}</span>
              </button>
            )}
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
                  onClick={() => {
                    setShowAdded(false);
                    router.push("/checkout");
                  }}
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

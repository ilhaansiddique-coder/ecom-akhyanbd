"use client";

import Image from "next/image";
import Link from "next/link";
import { FiShoppingCart, FiHeart } from "react-icons/fi";
import type { Product } from "@/data/products";
import { toBn } from "@/utils/toBn";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { useLang } from "@/lib/LanguageContext";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const { t, lang } = useLang();
  const wishlisted = isWishlisted(product.id);
  const displayName = product.nameBn || product.name;
  const { price, originalPrice, image: rawImage, badge, badgeColor = "bg-primary" } = product;
  const image = rawImage || "/placeholder.png";
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleAddToCart = () => {
    addItem({ id: product.id, name: displayName, price, image });
  };

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden group shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
      <Link href={`/products/${slug}`} className="block">
        <div className="relative overflow-hidden aspect-square bg-background-alt">
          <Image
            src={image}
            alt={displayName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority={priority}
            unoptimized={image.includes("/storage/")}
          />

          {badge && (
            <span className={`absolute top-3 left-3 ${badgeColor} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md`}>
              {badge}
            </span>
          )}

          {discount > 0 && !badge && (
            <span className="absolute top-3 left-3 bg-sale-red text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-md">
              -{lang === "bn" ? toBn(discount) : discount}%
            </span>
          )}

          {/* Wishlist heart */}
          <button
            onClick={(e) => { e.preventDefault(); toggle(product.id); }}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors cursor-pointer"
          >
            <FiHeart className={`w-4 h-4 ${wishlisted ? "text-sale-red fill-sale-red" : "text-gray-400"}`} />
          </button>

          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300 flex items-center justify-center">
            <button
              onClick={(e) => { e.preventDefault(); handleAddToCart(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-primary p-3 rounded-full shadow-lg hover:bg-primary hover:text-white cursor-pointer"
            >
              <FiShoppingCart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/products/${slug}`}>
          <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {displayName}
          </h3>
        </Link>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="font-bold text-primary text-lg">৳{lang === "bn" ? toBn(price) : price}</span>
          {originalPrice && (
            <span className="text-text-light line-through text-sm">৳{lang === "bn" ? toBn(originalPrice) : originalPrice}</span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          className="mt-3 w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <FiShoppingCart className="w-4 h-4" />
          <span>{t("product.order")}</span>
        </button>
      </div>
    </div>
  );
}

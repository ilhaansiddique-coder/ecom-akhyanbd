"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiShoppingCart, FiShoppingBag, FiMinus, FiPlus, FiStar, FiCheck } from "react-icons/fi";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import { trackAddToCart, trackViewContent, feedContentId } from "@/lib/analytics";
import { toBn } from "@/utils/toBn";
import ProductGallery from "@/components/ProductGallery";

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  review: string;
  created_at: string;
}

interface Variant {
  id: number;
  label: string;
  price: number;
  original_price?: number;
  stock: number;
  unlimited_stock?: boolean;
  image?: string;
}

interface ProductDetailClientProps {
  productId: number;
  productName: string;
  price: number;
  image: string;
  hasVariations?: boolean;
  variationType?: string;
  variants?: Variant[];
  onVariantImageChange?: (image: string | undefined) => void;
}

export function TText({ en, bn }: { en: string; bn: string }) {
  const { lang } = useLang();
  return <>{lang === "en" ? en : bn}</>;
}

export function AddToCartSection({ productId, productName, price, image, hasVariations, variationType, variants, onVariantImageChange, productStock, productUnlimitedStock }: ProductDetailClientProps & { productStock?: number; productUnlimitedStock?: boolean }) {
  const { addItem } = useCart();
  const { lang } = useLang();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [showAdded, setShowAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const needsVariantSelection = hasVariations && variants && variants.length > 0;
  const isDisabled = !!needsVariantSelection && !selectedVariant;

  // Notify parent when variant image changes + reset quantity to 1
  useEffect(() => {
    onVariantImageChange?.(selectedVariant?.image);
    setQuantity(1);
  }, [selectedVariant, onVariantImageChange]);

  const activePrice = selectedVariant ? selectedVariant.price : price;
  const activeImage = selectedVariant?.image || image;
  const activeOriginalPrice = selectedVariant?.original_price;

  // Stock logic
  const activeStock = selectedVariant ? selectedVariant.stock : (needsVariantSelection ? 0 : (productStock ?? 0));
  const activeUnlimited = selectedVariant ? selectedVariant.unlimited_stock : (needsVariantSelection ? false : productUnlimitedStock);
  const isOutOfStock = !activeUnlimited && activeStock <= 0 && !needsVariantSelection;
  const isVariantOutOfStock = selectedVariant && !selectedVariant.unlimited_stock && selectedVariant.stock <= 0;
  const maxQty = activeUnlimited ? 999 : Math.max(activeStock, 1);

  const handleAddToBag = () => {
    if (isOutOfStock || isVariantOutOfStock) return;
    addItem({
      id: productId,
      variantId: selectedVariant?.id,
      name: productName,
      variantLabel: selectedVariant?.label,
      price: activePrice,
      image: activeImage,
      stock: activeUnlimited ? undefined : activeStock,
      unlimitedStock: activeUnlimited,
    }, quantity);
    trackAddToCart({
      content_ids: [feedContentId(productId, selectedVariant?.id)],
      content_name: productName,
      value: activePrice * quantity,
      quantity,
    });
    setShowAdded(true);
  };

  const handleOrderNow = () => {
    if (isOutOfStock || isVariantOutOfStock) return;
    addItem({
      id: productId,
      variantId: selectedVariant?.id,
      name: productName,
      variantLabel: selectedVariant?.label,
      price: activePrice,
      image: activeImage,
      stock: activeUnlimited ? undefined : activeStock,
      unlimitedStock: activeUnlimited,
    }, quantity);
    trackAddToCart({
      content_ids: [feedContentId(productId, selectedVariant?.id)],
      content_name: productName,
      value: activePrice * quantity,
      quantity,
    });
    router.push("/checkout");
  };

  return (
    <>
      <div className="space-y-3">
        {/* Variant Price + Selector */}
        {needsVariantSelection && (
          <div>
            {/* Variant price — shown at top */}
            <div className="flex items-center gap-3 mb-4">
              {selectedVariant ? (
                <>
                  <span className="text-3xl font-bold text-primary" suppressHydrationWarning>৳{toBn(activePrice)}</span>
                  {activeOriginalPrice && activeOriginalPrice > activePrice && (
                    <>
                      <span className="text-xl text-text-light line-through" suppressHydrationWarning>৳{toBn(activeOriginalPrice)}</span>
                      <span className="text-sm font-bold text-sale-red bg-sale-red/10 px-2.5 py-1 rounded-lg" suppressHydrationWarning>
                        {toBn(Math.round(((activeOriginalPrice - activePrice) / activeOriginalPrice) * 100))}% {lang === "en" ? "off" : "ছাড়"}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-3xl font-bold text-primary" suppressHydrationWarning>
                  ৳{toBn(Math.min(...variants!.map(v => v.price)))}
                  {Math.min(...variants!.map(v => v.price)) !== Math.max(...variants!.map(v => v.price)) && <> - ৳{toBn(Math.max(...variants!.map(v => v.price)))}</>}
                </span>
              )}
            </div>
            {/* Variant buttons */}
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-foreground">{variationType || (lang === "en" ? "Select Option" : "অপশন বাছুন")}</label>
              {selectedVariant && (
                <button type="button" onClick={() => setSelectedVariant(null)}
                  className="text-xs text-text-muted hover:text-sale-red transition-colors">
                  {lang === "en" ? "Clear" : "মুছুন"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {variants!.map((v) => {
                const vOutOfStock = !v.unlimited_stock && v.stock <= 0;
                return (
                  <button key={v.id} type="button" onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all relative ${
                      vOutOfStock ? "border-gray-200 text-gray-300 line-through cursor-not-allowed" :
                      selectedVariant?.id === v.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-foreground hover:border-primary/50"
                    }`}>
                    {v.label}
                    {!v.unlimited_stock && v.stock > 0 && v.stock <= 5 && (
                      <span className="ml-1 text-[10px] text-amber-600">({toBn(v.stock)})</span>
                    )}
                  </button>
                );
              })}
            </div>
            {isDisabled && (
              <p className="mt-2 text-xs text-sale-red">{lang === "en" ? "Please select an option" : "অনুগ্রহ করে একটি অপশন বাছুন"}</p>
            )}
          </div>
        )}

        {/* Stock indicator */}
        {!needsVariantSelection && !activeUnlimited && (
          <div className="text-sm">
            {isOutOfStock ? (
              <span className="font-semibold text-red-500">{lang === "en" ? "Out of Stock" : "স্টক শেষ"}</span>
            ) : activeStock <= 5 ? (
              <span className="font-medium text-amber-600">{lang === "en" ? `Only ${activeStock} left!` : `মাত্র ${toBn(activeStock)}টি বাকি!`}</span>
            ) : (
              <span className="text-gray-500">{lang === "en" ? `${activeStock} in stock` : `${toBn(activeStock)}টি স্টকে আছে`}</span>
            )}
          </div>
        )}
        {selectedVariant && !selectedVariant.unlimited_stock && (
          <div className="text-sm">
            {isVariantOutOfStock ? (
              <span className="font-semibold text-red-500">{lang === "en" ? "Out of Stock" : "স্টক শেষ"}</span>
            ) : selectedVariant.stock <= 5 ? (
              <span className="font-medium text-amber-600">{lang === "en" ? `Only ${selectedVariant.stock} left!` : `মাত্র ${toBn(selectedVariant.stock)}টি বাকি!`}</span>
            ) : (
              <span className="text-gray-500">{lang === "en" ? `${selectedVariant.stock} in stock` : `${toBn(selectedVariant.stock)}টি স্টকে আছে`}</span>
            )}
          </div>
        )}

        {/* Row 1: Quantity */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-border w-fit">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="p-3 hover:text-primary transition-colors disabled:opacity-30">
            <FiMinus className="w-4 h-4" />
          </button>
          <span className="text-lg font-semibold w-10 text-center" suppressHydrationWarning>{toBn(quantity)}</span>
          <button onClick={() => setQuantity(Math.min(quantity + 1, maxQty))} disabled={!activeUnlimited && quantity >= maxQty} className="p-3 hover:text-primary transition-colors disabled:opacity-30">
            <FiPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Add to Bag */}
        <button
          onClick={handleAddToBag}
          disabled={isDisabled || isOutOfStock || !!isVariantOutOfStock}
          className={`w-full py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 border-2 ${(isDisabled || isOutOfStock || isVariantOutOfStock) ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-primary text-primary hover:bg-primary/5"}`}
        >
          <FiShoppingCart className="w-5 h-5" />
          {(isOutOfStock || isVariantOutOfStock) ? (lang === "en" ? "Out of Stock" : "স্টক শেষ") : (lang === "en" ? "Add to Cart" : "কার্টে যোগ করুন")}
        </button>

        {/* Row 3: Order Now */}
        <button
          onClick={handleOrderNow}
          disabled={isDisabled || isOutOfStock || !!isVariantOutOfStock}
          className={`w-full py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm ${isDisabled ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-primary text-white hover:bg-primary-light"}`}
        >
          <FiShoppingBag className="w-5 h-5" />
          {lang === "en" ? "Order Now" : "অর্ডার করুন"}
        </button>
      </div>

      {/* Added to Cart Popup */}
      {showAdded && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAdded(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <FiCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {lang === "en" ? "Added to Cart!" : "কার্টে যোগ হয়েছে!"}
              </h3>
              <p className="text-sm text-gray-500 mb-5 line-clamp-1">{productName}</p>
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
        </div>
      )}
    </>
  );
}

interface ProductGalleryWithVariantsProps {
  mainImage: string;
  images: string[];
  alt: string;
  productId: number;
  productName: string;
  price: number;
  productStock?: number;
  productUnlimitedStock?: boolean;
  hasVariations?: boolean;
  variationType?: string;
  variants?: Variant[];
  galleryOverlay?: React.ReactNode;
  detailsTop?: React.ReactNode;
  detailsBottom?: React.ReactNode;
}

export function ProductGalleryWithVariants({
  mainImage, images, alt, productId, productName, price, productStock, productUnlimitedStock, hasVariations, variationType, variants,
  galleryOverlay, detailsTop, detailsBottom,
}: ProductGalleryWithVariantsProps) {
  const [variantImage, setVariantImage] = useState<string | undefined>(undefined);
  const handleVariantImageChange = useCallback((img: string | undefined) => {
    setVariantImage(img);
  }, []);

  // Track ViewContent on mount — defer so URL reflects current page after navigation.
  //
  // content_ids: send the parent productId. For variable products, FB matches
  // it against the catalog's item_group_id (which equals product.id in our
  // feed) — that's FB's recommended pattern for group/parent views. The
  // variant-specific id only matters for AddToCart/Purchase where the
  // customer has actually picked a variant.
  useEffect(() => {
    const timer = setTimeout(() => {
      trackViewContent({
        content_ids: [feedContentId(productId)],
        content_name: productName,
        value: price,
        content_type: "product",
        sourceUrl: window.location.href,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [productId, productName, price]);

  return (
    <>
      <div className="relative">
        <ProductGallery
          mainImage={mainImage}
          images={images}
          alt={alt}
          overrideImage={variantImage}
          // Surface every variant image as a thumbnail too. Dedupe + ordering
          // is handled inside ProductGallery; we just need to hand it the raw
          // list of {id, image, label}. Filter out variants without images so
          // the strip stays clean for variable products with mixed coverage.
          variantImages={
            hasVariations
              ? (variants || [])
                  .filter((v) => !!v.image)
                  .map((v) => ({ id: v.id, image: v.image!, label: v.label }))
              : undefined
          }
        />
        {galleryOverlay}
      </div>
      <div>
        {detailsTop}
        <div className="mt-6">
          <AddToCartSection
            productId={productId}
            productName={productName}
            price={price}
            image={mainImage}
            productStock={productStock}
            productUnlimitedStock={productUnlimitedStock}
            hasVariations={hasVariations}
            variationType={variationType}
            variants={variants}
            onVariantImageChange={handleVariantImageChange}
          />
        </div>
        {detailsBottom}
      </div>
    </>
  );
}

export function ReviewsSection({ productId }: { productId: number }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getProductReviews(productId)
      .then((r) => setReviews(Array.isArray(r) ? r : r.data || []))
      .catch(() => {});
  }, [productId]);

  useEffect(() => {
    if (user) setReviewName(user.name);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      await api.submitReview({ product_id: productId, customer_name: reviewName, rating: reviewRating, review: reviewText });
      setMsg(lang === "en" ? "Your review has been submitted. It will be published after approval." : "আপনার রিভিউ জমা হয়েছে। অনুমোদনের পর প্রকাশিত হবে।");
      setReviewText("");
      setReviewRating(5);
    } catch {
      setMsg(lang === "en" ? "Failed to submit review." : "রিভিউ জমা দিতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="mt-12">
      {/* Rating summary */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <FiStar key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
            ))}
          </div>
          <span className="text-sm text-text-muted" suppressHydrationWarning>({lang === "en" ? `${reviews.length} reviews` : `${toBn(reviews.length)}টি রিভিউ`})</span>
        </div>
      )}

      <h2 className="text-xl font-bold text-foreground mb-6">{lang === "en" ? "Customer Reviews" : "গ্রাহকদের মতামত"}</h2>

      {reviews.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-5 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-bold">
                  {r.customer_name.charAt(0)}
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">{r.customer_name}</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <FiStar key={i} className={`w-3 h-3 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-text-body leading-relaxed">{r.review}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted text-sm mb-8">{lang === "en" ? "No reviews yet for this product. Be the first to review!" : "এই পণ্যে এখনো কোনো রিভিউ নেই। প্রথম রিভিউ দিন!"}</p>
      )}

      {/* Review Form */}
      <div className="bg-white rounded-2xl border border-border p-6 max-w-lg">
        <h3 className="text-base font-bold text-foreground mb-4">{lang === "en" ? "Leave your review" : "আপনার মতামত দিন"}</h3>
        {msg && <div className="p-3 mb-4 bg-primary/10 text-primary text-sm rounded-lg">{msg}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{lang === "en" ? "Your name" : "আপনার নাম"}</label>
            <input type="text" value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{lang === "en" ? "Rating" : "রেটিং"}</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setReviewRating(star)} className="p-1">
                  <FiStar className={`w-6 h-6 transition-colors ${star <= reviewRating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{lang === "en" ? "Your review" : "আপনার মতামত"}</label>
            <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} required rows={3} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none" placeholder={lang === "en" ? "Share your experience with this product..." : "এই পণ্য সম্পর্কে আপনার অভিজ্ঞতা লিখুন..."} />
          </div>
          <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50">
            {submitting ? (lang === "en" ? "Submitting..." : "জমা হচ্ছে...") : (lang === "en" ? "Submit Review" : "রিভিউ জমা দিন")}
          </button>
        </form>
      </div>
    </div>
  );
}

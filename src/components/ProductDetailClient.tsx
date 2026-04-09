"use client";

import { useState, useEffect } from "react";
import { FiShoppingCart, FiMinus, FiPlus, FiStar, FiCheck } from "react-icons/fi";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  review: string;
  created_at: string;
}

interface ProductDetailClientProps {
  productId: number;
  productName: string;
  price: number;
  image: string;
}

export function AddToCartSection({ productId, productName, price, image }: ProductDetailClientProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAdd = () => {
    addItem({ id: productId, name: productName, price, image }, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1 bg-white rounded-xl border border-border">
        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:text-primary transition-colors">
          <FiMinus className="w-4 h-4" />
        </button>
        <span className="text-lg font-semibold w-10 text-center">{toBn(quantity)}</span>
        <button onClick={() => setQuantity(quantity + 1)} className="p-3 hover:text-primary transition-colors">
          <FiPlus className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={handleAdd}
        className={`flex-1 py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm ${addedToCart ? "bg-green-600 text-white" : "bg-primary text-white hover:bg-primary-light"}`}
      >
        {addedToCart ? (
          <><FiCheck className="w-5 h-5" /> কার্টে যোগ হয়েছে</>
        ) : (
          <><FiShoppingCart className="w-5 h-5" /> অর্ডার করুন</>
        )}
      </button>
    </div>
  );
}

export function ReviewsSection({ productId }: { productId: number }) {
  const { user } = useAuth();
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
      setMsg("আপনার রিভিউ জমা হয়েছে। অনুমোদনের পর প্রকাশিত হবে।");
      setReviewText("");
      setReviewRating(5);
    } catch {
      setMsg("রিভিউ জমা দিতে সমস্যা হয়েছে।");
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
          <span className="text-sm text-text-muted">({toBn(reviews.length)}টি রিভিউ)</span>
        </div>
      )}

      <h2 className="text-xl font-bold text-foreground mb-6">গ্রাহকদের মতামত</h2>

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
        <p className="text-text-muted text-sm mb-8">এই পণ্যে এখনো কোনো রিভিউ নেই। প্রথম রিভিউ দিন!</p>
      )}

      {/* Review Form */}
      <div className="bg-white rounded-2xl border border-border p-6 max-w-lg">
        <h3 className="text-base font-bold text-foreground mb-4">আপনার মতামত দিন</h3>
        {msg && <div className="p-3 mb-4 bg-primary/10 text-primary text-sm rounded-lg">{msg}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">আপনার নাম</label>
            <input type="text" value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">রেটিং</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setReviewRating(star)} className="p-1">
                  <FiStar className={`w-6 h-6 transition-colors ${star <= reviewRating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">আপনার মতামত</label>
            <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} required rows={3} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none" placeholder="এই পণ্য সম্পর্কে আপনার অভিজ্ঞতা লিখুন..." />
          </div>
          <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50">
            {submitting ? "জমা হচ্ছে..." : "রিভিউ জমা দিন"}
          </button>
        </form>
      </div>
    </div>
  );
}

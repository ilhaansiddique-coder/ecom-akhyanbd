"use client";

import { FiStar } from "react-icons/fi";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import MotionFadeIn from "./MotionFadeIn";
import { useLang } from "@/lib/LanguageContext";

interface Review {
  id: number;
  customer_name: string;
  rating: number;
  review: string;
  product_name?: string;
  avatar?: string;
  image?: string;
}

const avatarColors = [
  "bg-primary", "bg-amber-600", "bg-emerald-600", "bg-blue-600",
  "bg-purple-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return name.slice(0, 2);
}

const HARDCODED_FALLBACK: Review[] = [
  { id: 1, customer_name: "সাবিনা ইয়াসমিন", review: "বাচ্চার জন্য টি-শার্ট নিয়েছিলাম, কাপড়টা অনেক নরম আর সাইজও পারফেক্ট। বাচ্চা পরে অনেক আরাম পাচ্ছে।", rating: 5 },
  { id: 2, customer_name: "নুসরাত জাহান", review: "ঈদের জন্য পোলো নিয়েছিলাম, মান অনেক ভালো এবং ডেলিভারিও দ্রুত হয়েছে। বাচ্চাকে অনেক কিউট লাগছে।", rating: 5 },
  { id: 3, customer_name: "তানিয়া আক্তার", review: "প্রাইস অনুযায়ী কাপড়ের কোয়ালিটি দারুণ। ছোট ভাগ্নের জন্য রম্পার নিয়েছি, পরিবারের সবাই খুশি।", rating: 5 },
];

interface ReviewsContent {
  title?: string;
  subtitle?: string;
  testimonials?: { name: string; rating: number; text: string; avatar?: string; image?: string }[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <FiStar
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

export default function CustomerReviews({ reviews, content }: { reviews?: Review[]; content?: ReviewsContent }) {
  const { t } = useLang();

  // Priority: 1) Dashboard testimonials (if any have names) → 2) DB reviews → 3) Hardcoded fallback
  const dashboardTestimonials: Review[] | null = content?.testimonials?.some(t => t.name)
    ? content.testimonials.filter(t => t.name).map((t, i) => ({
        id: 900 + i,
        customer_name: t.name,
        review: t.text,
        rating: t.rating,
        avatar: t.avatar || undefined,
        image: t.image || undefined,
      }))
    : null;

  const items = dashboardTestimonials || (reviews && reviews.length > 0 ? reviews : HARDCODED_FALLBACK);

  return (
    <section className="py-12 md:py-16 bg-background-alt">
      <div className="container mx-auto px-4">
        <MotionFadeIn className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground section-heading">
            {content?.title || t("reviews.title")}
          </h2>
          <p className="text-text-muted mt-4">{content?.subtitle || t("reviews.subtitle")}</p>
        </MotionFadeIn>

        <MotionFadeIn>
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={20}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="pb-14"
          >
            {items.map((review, idx) => (
              <SwiperSlide key={review.id}>
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm h-full">
                  <div className="flex items-center gap-3 mb-4">
                    {review.avatar ? (
                      <Image src={review.avatar} alt={review.customer_name} width={48} height={48} className="w-12 h-12 rounded-full object-cover shrink-0" unoptimized />
                    ) : (
                      <div className={`w-12 h-12 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {getInitials(review.customer_name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground text-sm truncate">
                        {review.customer_name}
                      </h4>
                      <StarRating rating={review.rating} />
                    </div>
                  </div>
                  <p className="text-text-body text-sm leading-relaxed line-clamp-3">
                    {review.review}
                  </p>
                  {review.image && (
                    <div className="mt-3">
                      <Image src={review.image} alt="" width={300} height={200} className="w-full h-auto rounded-xl object-cover max-h-40" unoptimized />
                    </div>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </MotionFadeIn>
      </div>
    </section>
  );
}

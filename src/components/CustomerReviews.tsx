"use client";

import { FiStar } from "react-icons/fi";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import MotionFadeIn from "./MotionFadeIn";
import { useLang } from "@/lib/LanguageContext";

const reviews = [
  {
    name: "মোঃ বেলাল শেখ",
    review:
      "খুবই ভালো মানের মধু পেয়েছি। টেস্ট অসাধারণ এবং একদম খাঁটি। ডেলিভারিও খুব দ্রুত হয়েছে। ধন্যবাদ মা ভেষজ বাণিজ্যালয়!",
    rating: 5,
    initials: "বশ",
    color: "bg-primary",
  },
  {
    name: "মোঃ মিলন মাহমুদ",
    review:
      "কাজু বাদাম অর্ডার করেছিলাম। একদম ফ্রেশ এবং ভালো মানের। প্যাকেজিংও অনেক সুন্দর ছিল। আবারও অর্ডার করব ইনশাআল্লাহ।",
    rating: 5,
    initials: "মম",
    color: "bg-amber-600",
  },
  {
    name: "শুহেভ আহমেদ",
    review:
      "মসলা কম্বো প্যাক নিয়েছিলাম। সব কিছু অনেক ফ্রেশ ও সুগন্ধযুক্ত। বাজারের চেয়ে অনেক ভালো মান। রিকমেন্ড করছি সবাইকে।",
    rating: 5,
    initials: "শআ",
    color: "bg-emerald-600",
  },
  {
    name: "মোঃ আতিকুর রহমান",
    review:
      "মা ভেষজ বাণিজ্যালয় থেকে প্রথম অর্ডার করলাম। খাঁটি পণ্য পেয়েছি। একদিনের মধ্যে ডেলিভারি পেয়ে অবাক হয়েছি। ভালো সার্ভিস!",
    rating: 5,
    initials: "আর",
    color: "bg-blue-600",
  },
  {
    name: "সামির আহমেদ",
    review:
      "কালোজিরা মধু নিয়েছিলাম। একদম খাঁটি, কোনো ভেজাল নেই। দামও অনেক রিজনেবল। এরকম খাঁটি পণ্য পাওয়া এখন কঠিন।",
    rating: 5,
    initials: "সআ",
    color: "bg-purple-600",
  },
];

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

export default function CustomerReviews() {
  const { t } = useLang();
  return (
    <section className="py-12 md:py-16 bg-background-alt">
      <div className="container mx-auto px-4">
        <MotionFadeIn className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground section-heading">
            {t("reviews.title")}
          </h2>
          <p className="text-text-muted mt-4">{t("reviews.subtitle")}</p>
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
            {reviews.map((review) => (
              <SwiperSlide key={review.name}>
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm h-full">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full ${review.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                    >
                      {review.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground text-sm truncate">
                        {review.name}
                      </h4>
                      <StarRating rating={review.rating} />
                    </div>
                  </div>

                  {/* Review text */}
                  <p className="text-text-body text-sm leading-relaxed line-clamp-3">
                    {review.review}
                  </p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </MotionFadeIn>
      </div>
    </section>
  );
}

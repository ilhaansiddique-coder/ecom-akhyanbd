"use client";

import { useState, useEffect, memo } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "@/data/products";
import { FiZap } from "react-icons/fi";
import { toBn } from "@/utils/toBn";
import MotionFadeIn from "./MotionFadeIn";
import { useLang } from "@/lib/LanguageContext";

function calcTimeLeft(endTime?: string) {
  const end = endTime ? new Date(endTime).getTime() : Date.now() + 24 * 60 * 60 * 1000;
  const diff = Math.max(0, end - Date.now());
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)) % 24,
    minutes: Math.floor(diff / (1000 * 60)) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

function Countdown({ endTime }: { endTime?: string }) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(endTime));
  const { t, lang } = useLang();

  useEffect(() => {
    setTimeLeft(calcTimeLeft(endTime));
    const timer = setInterval(() => setTimeLeft(calcTimeLeft(endTime)), 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-muted font-medium mr-2">{t("flash.endsIn")}</span>
      {[
        { value: timeLeft.hours, label: t("flash.hours") },
        { value: timeLeft.minutes, label: t("flash.minutes") },
        { value: timeLeft.seconds, label: t("flash.seconds") },
      ].map((item, i) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className="bg-primary text-white w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-md" style={{ animation: "countdown-pulse 1s ease-in-out infinite" }}>
            <span className="text-lg font-bold leading-none" suppressHydrationWarning>{toBn(String(item.value).padStart(2, "0"))}</span>
            <span className="text-[9px] tracking-wider opacity-80">{item.label}</span>
          </div>
          {i < 2 && <span className="text-2xl font-bold text-primary">:</span>}
        </div>
      ))}
    </div>
  );
}

const ProductGrid = memo(function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl">
      {products.map((product, i) => (
        <MotionFadeIn key={product.id} delay={i * 0.1}>
          <ProductCard product={product} priority={i === 0} />
        </MotionFadeIn>
      ))}
    </div>
  );
});

interface FlashSaleClientProps {
  title: string;
  endsAt?: string;
  products: Product[];
}

export default function FlashSaleClient({ title, endsAt, products }: FlashSaleClientProps) {
  const { t } = useLang();
  return (
    <section className="py-12 md:py-16 bg-background-alt">
      <div className="container mx-auto px-4">
        <MotionFadeIn className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sale-red/10 rounded-xl">
              <FiZap className="w-6 h-6 text-sale-red" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
              <p className="text-text-muted text-sm">{t("flash.subtitle")}</p>
            </div>
          </div>

          <Countdown endTime={endsAt} />
        </MotionFadeIn>

        <ProductGrid products={products} />
      </div>
    </section>
  );
}

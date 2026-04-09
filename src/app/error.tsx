"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FiAlertTriangle, FiHome, FiRefreshCw } from "react-icons/fi";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-sale-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiAlertTriangle className="w-8 h-8 text-sale-red" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">কিছু একটা সমস্যা হয়েছে</h2>
        <p className="text-text-muted mb-8">দুঃখিত, একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            আবার চেষ্টা করুন
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold rounded-xl transition-colors"
          >
            <FiHome className="w-4 h-4" />
            হোম পেজে যান
          </Link>
        </div>
      </div>
    </section>
  );
}

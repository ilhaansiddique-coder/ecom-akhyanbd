import Link from "next/link";
import { FiHome, FiShoppingBag } from "react-icons/fi";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "পেজটি পাওয়া যায়নি — মা ভেষজ বাণিজ্যালয়",
};

export default function NotFound() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-lg mx-auto animate-[slide-up_0.5s_ease-out]">
        <h1 className="text-[120px] md:text-[160px] font-bold leading-none bg-linear-to-br from-primary/20 to-primary/5 bg-clip-text text-transparent select-none">
          ৪০৪
        </h1>

        <div className="absolute top-8 left-1/2 -translate-x-1/2 animate-[float-y_3s_ease-in-out_infinite]">
          <span className="text-5xl">🌿</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-foreground -mt-4 mb-3">
          পেজটি পাওয়া যায়নি
        </h2>
        <p className="text-text-muted leading-relaxed max-w-sm mx-auto">
          আপনি যে পেজটি খুঁজছেন সেটি এখানে নেই। হয়তো সরানো হয়েছে, নাম পরিবর্তন করা হয়েছে
          অথবা ওয়েব ঠিকানাটি ভুল।
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors shadow-lg hover:shadow-primary/25"
          >
            <FiHome className="w-4 h-4" />
            হোম পেজে যান
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold rounded-xl transition-colors"
          >
            <FiShoppingBag className="w-4 h-4" />
            শপে যান
          </Link>
        </div>

        <p className="text-text-light text-sm mt-8">
          সাহায্যের জন্য{" "}
          <Link href="/contact" className="text-primary hover:underline font-medium">
            যোগাযোগ করুন
          </Link>
        </p>
      </div>
    </section>
  );
}

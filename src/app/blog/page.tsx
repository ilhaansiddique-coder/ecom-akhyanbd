import Link from "next/link";
import { FiFileText, FiArrowLeft } from "react-icons/fi";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ব্লগ",
  description: "সর্বশেষ পোস্ট, টিপস এবং আপডেট পড়ুন।",
};

export default function BlogPage() {
  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-background-alt px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiFileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">ব্লগ</h1>
        <p className="text-text-muted mb-8">
          আমাদের ব্লগ শীঘ্রই আসছে। শিশু ফ্যাশন, স্টাইল টিপস ও প্যারেন্টিং গাইড নিয়ে
          দারুণ সব লেখা থাকছে।
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          হোম পেজে ফিরুন
        </Link>
      </div>
    </section>
  );
}

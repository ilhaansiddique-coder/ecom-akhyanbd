import { FiMail } from "react-icons/fi";
import MotionFadeIn from "@/components/MotionFadeIn";
import ContactForm from "@/components/ContactForm";
import ContactInfo from "@/components/ContactInfo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "যোগাযোগ — মা ভেষজ বাণিজ্যালয়",
  description: "যেকোনো প্রশ্ন, পরামর্শ বা অর্ডার সংক্রান্ত বিষয়ে আমাদের সাথে যোগাযোগ করুন। মা ভেষজ বাণিজ্যালয়।",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-primary via-primary-light to-primary-dark overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-28 -left-28 w-[420px] h-[420px] bg-white/5 rounded-full" />
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10 text-center">
          <MotionFadeIn>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-white/90 text-sm mb-6 backdrop-blur-sm">
              <FiMail className="w-4 h-4" />
              আমাদের সাথে কথা বলুন
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">যোগাযোগ</h1>
            <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
              যেকোনো প্রশ্ন, পরামর্শ বা অর্ডার সংক্রান্ত বিষয়ে আমাদের সাথে যোগাযোগ করুন।
            </p>
          </MotionFadeIn>
        </div>
      </section>

      {/* Main */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {/* Form */}
            <MotionFadeIn className="lg:col-span-2">
              <div className="bg-white border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-foreground mb-6">বার্তা পাঠান</h2>
                <ContactForm />
              </div>
            </MotionFadeIn>

            {/* Sidebar — dynamic from site settings */}
            <ContactInfo />
          </div>
        </div>
      </section>
    </div>
  );
}

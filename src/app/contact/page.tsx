import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import MotionFadeIn from "@/components/MotionFadeIn";
import ContactForm from "@/components/ContactForm";
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

            {/* Sidebar — all static, server-rendered */}
            <div className="space-y-6">
              <MotionFadeIn delay={0.1}>
                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-foreground mb-5">যোগাযোগের তথ্য</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <FiMapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-text-muted font-medium mb-0.5">ঠিকানা</p>
                        <p className="text-foreground text-sm font-semibold">নাটোর, বাংলাদেশ</p>
                        <p className="text-text-muted text-xs mt-0.5">ইব্রাহিমপুর, লক্ষ্মীপুর, সদর, নাটোর-৬৪০০</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <FiPhone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-text-muted font-medium mb-0.5">ফোন</p>
                        <a href="tel:+8801731492117" className="text-foreground text-sm font-semibold hover:text-primary transition-colors">+880 1731492117</a>
                        <p className="text-text-muted text-xs mt-0.5">সকাল ৯টা — রাত ৯টা</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <FiMail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-text-muted font-medium mb-0.5">ইমেইল</p>
                        <a href="mailto:info@mavesoj.com" className="text-foreground text-sm font-semibold hover:text-primary transition-colors break-all">info@mavesoj.com</a>
                        <p className="text-text-muted text-xs mt-0.5">২৪ ঘণ্টার মধ্যে উত্তর</p>
                      </div>
                    </div>
                  </div>
                </div>
              </MotionFadeIn>

              <MotionFadeIn delay={0.2}>
                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-foreground mb-4">সামাজিক মাধ্যম</h3>
                  <div className="space-y-3">
                    {[
                      { icon: FaFacebookF, href: "https://www.facebook.com/mavesoj", label: "ফেসবুক পেজ", color: "#3b5998" },
                      { icon: FaInstagram, href: "https://www.instagram.com/mavesoj", label: "ইনস্টাগ্রাম", color: "#8a3ab9" },
                      { icon: FaYoutube, href: "https://www.youtube.com/@mavesoj", label: "ইউটিউব চ্যানেল", color: "#cd201f" },
                    ].map((s) => (
                      <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 border rounded-xl transition-colors group" style={{ borderColor: `${s.color}33`, backgroundColor: `${s.color}08` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color }}>
                          <s.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{s.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </MotionFadeIn>

              <MotionFadeIn delay={0.3}>
                <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14547.5!2d89.2075!3d24.4107!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39fdfa0a8fbe0a9b%3A0x9eb5cfa96e6b5e5b!2sNatore!5e0!3m2!1sen!2sbd!4v1700000000000"
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="মা ভেষজ বাণিজ্যালয় অবস্থান"
                    className="w-full"
                  />
                  <div className="p-4">
                    <p className="text-xs text-text-muted text-center">ইব্রাহিমপুর, লক্ষ্মীপুর, সদর, নাটোর-৬৪০০, বাংলাদেশ</p>
                  </div>
                </div>
              </MotionFadeIn>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

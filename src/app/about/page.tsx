import { FiHeart, FiTarget, FiUsers, FiAward, FiStar, FiShield, FiTruck, FiSmile } from "react-icons/fi";
import MotionFadeIn from "@/components/MotionFadeIn";
import { MotionStaggerContainer, MotionStaggerItem } from "@/components/MotionStagger";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "আমাদের সম্পর্কে — মা ভেষজ বাণিজ্যালয়",
  description: "মা ভেষজ বাণিজ্যালয় — বাংলাদেশের একটি বিশ্বস্ত প্রাকৃতিক ভেষজ পণ্যের প্রতিষ্ঠান। প্রকৃতির শক্তিতে সুস্থ থাকুন।",
};

const whyChooseUs = [
  { icon: FiShield, title: "১০০% প্রাকৃতিক", description: "আমাদের সকল পণ্য সম্পূর্ণ প্রাকৃতিক উপায়ে তৈরি। কোনো কৃত্রিম রং, সুগন্ধি বা সংরক্ষক ব্যবহার করা হয় না।" },
  { icon: FiTruck, title: "দ্রুত ডেলিভারি", description: "সারা বাংলাদেশে আমরা দ্রুততম সময়ে পণ্য পৌঁছে দিই। সাধারণত ৩–৫ কার্যদিবসের মধ্যে ডেলিভারি।" },
  { icon: FiStar, title: "সাশ্রয়ী মূল্য", description: "উচ্চমানের ভেষজ পণ্য সবচেয়ে সাশ্রয়ী মূল্যে পাওয়ার নিশ্চয়তা দিচ্ছি আমরা।" },
  { icon: FiSmile, title: "গ্রাহক সন্তুষ্টি", description: "আমাদের গ্রাহকদের সন্তুষ্টিই আমাদের সবচেয়ে বড় পুরস্কার। যেকোনো সমস্যায় আমাদের সাপোর্ট টিম সর্বদা আপনার পাশে।" },
];

const teamMembers = [
  { name: "রহিম উদ্দিন", role: "প্রতিষ্ঠাতা ও প্রধান নির্বাহী", initials: "র" },
  { name: "সুমাইয়া বেগম", role: "ভেষজ বিশেষজ্ঞ", initials: "স" },
  { name: "করিম হোসেন", role: "বিক্রয় ও বিপণন প্রধান", initials: "ক" },
  { name: "নাজমা আক্তার", role: "গ্রাহক সেবা প্রধান", initials: "ন" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-linear-to-br from-primary via-primary-light to-primary-dark overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-28 -left-28 w-[420px] h-[420px] bg-white/5 rounded-full" />
        </div>
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10 text-center">
          <MotionFadeIn>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-white/90 text-sm mb-6 backdrop-blur-sm">
              <FiHeart className="w-4 h-4 text-red-300" />
              প্রকৃতির সেরা উপহার
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5">আমাদের সম্পর্কে</h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              মা ভেষজ বাণিজ্যালয় — বাংলাদেশের একটি বিশ্বস্ত প্রাকৃতিক ভেষজ পণ্যের প্রতিষ্ঠান।
              আমরা বিশ্বাস করি প্রকৃতির মধ্যেই লুকিয়ে আছে সুস্বাস্থ্যের চাবিকাঠি।
            </p>
          </MotionFadeIn>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <MotionFadeIn className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-6">
              <FiTarget className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 section-heading">আমাদের লক্ষ্য</h2>
            <p className="text-text-body text-lg leading-relaxed mt-6">
              প্রকৃতির শক্তিতে সুস্থ থাকুন। আমাদের লক্ষ্য হলো বাংলাদেশের প্রতিটি মানুষের কাছে
              বিশুদ্ধ ও প্রাকৃতিক ভেষজ পণ্য সহজলভ্য করা।
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                { value: "৫০০+", label: "ভেষজ পণ্য" },
                { value: "১০,০০০+", label: "সন্তুষ্ট গ্রাহক" },
                { value: "৫+", label: "বছরের অভিজ্ঞতা" },
              ].map((stat) => (
                <div key={stat.label} className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                  <p className="text-4xl font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-text-muted font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </MotionFadeIn>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 md:py-20 bg-background-alt">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <MotionFadeIn direction="right">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
                <FiHeart className="w-4 h-4" />
                আমাদের গল্প
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">কীভাবে শুরু হলো আমাদের যাত্রা</h2>
              <div className="space-y-4 text-text-body leading-relaxed">
                <p>মা ভেষজ বাণিজ্যালয়ের যাত্রা শুরু হয়েছিল একটি সাধারণ স্বপ্ন থেকে — মানুষকে প্রকৃতির কাছাকাছি নিয়ে যাওয়া।</p>
                <p>প্রতিষ্ঠার পর থেকে আমরা দেশের বিভিন্ন প্রান্ত থেকে বিশুদ্ধ ভেষজ উপাদান সংগ্রহ করে আসছি।</p>
                <p>আজ আমরা গর্বিত যে হাজার হাজার গ্রাহক আমাদের বিশ্বাস করেন এবং আমাদের পণ্য ব্যবহার করে উপকৃত হচ্ছেন।</p>
              </div>
            </MotionFadeIn>
            <MotionFadeIn direction="left" delay={0.15}>
              <div className="bg-linear-to-br from-primary/10 to-primary/5 border border-primary/15 rounded-3xl p-8 md:p-10">
                <div className="text-center mb-8"><span className="text-7xl">🌿</span></div>
                <div className="space-y-4">
                  {[
                    { year: "২০১৮", event: "মা ভেষজ বাণিজ্যালয় প্রতিষ্ঠা" },
                    { year: "২০২০", event: "অনলাইন বিক্রয় শুরু" },
                    { year: "২০২২", event: "১০,০০০ গ্রাহকের মাইলফলক" },
                    { year: "২০২৪", event: "৫০০+ পণ্যের বিশাল সংগ্রহ" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg shrink-0 mt-0.5">{item.year}</span>
                      <p className="text-text-body text-sm">{item.event}</p>
                    </div>
                  ))}
                </div>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <MotionFadeIn className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
              <FiAward className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground section-heading">কেন আমাদের বেছে নেবেন?</h2>
            <p className="text-text-muted mt-6 max-w-xl mx-auto">আমরা শুধু পণ্য বিক্রি করি না — আমরা আপনার সুস্বাস্থ্যের যত্ন নিই।</p>
          </MotionFadeIn>
          <MotionStaggerContainer staggerDelay={0.12} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map((item) => (
              <MotionStaggerItem key={item.title} className="bg-white border border-border rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 mx-auto bg-primary/10 group-hover:bg-primary rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <item.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-foreground text-base mb-2">{item.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{item.description}</p>
              </MotionStaggerItem>
            ))}
          </MotionStaggerContainer>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-20 bg-primary">
        <div className="container mx-auto px-4">
          <MotionFadeIn className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
              <FiUsers className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">আমাদের দল</h2>
            <p className="text-white/70 max-w-xl mx-auto">আমাদের অভিজ্ঞ ও নিবেদিতপ্রাণ দলটি সর্বদা আপনার সেবায় নিয়োজিত।</p>
          </MotionFadeIn>
          <MotionStaggerContainer staggerDelay={0.12} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <MotionStaggerItem key={member.name} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/20 transition-colors">
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-white">{member.initials}</span>
                </div>
                <h3 className="font-bold text-white text-sm md:text-base">{member.name}</h3>
                <p className="text-white/60 text-xs mt-1">{member.role}</p>
              </MotionStaggerItem>
            ))}
          </MotionStaggerContainer>
        </div>
      </section>
    </div>
  );
}

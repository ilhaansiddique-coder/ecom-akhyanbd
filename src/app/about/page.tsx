import { FiHeart, FiTarget, FiUsers, FiAward, FiStar, FiShield, FiTruck, FiSmile } from "react-icons/fi";
import MotionFadeIn from "@/components/MotionFadeIn";
import { MotionStaggerContainer, MotionStaggerItem } from "@/components/MotionStagger";
import { TText } from "@/components/ProductDetailClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "আমাদের সম্পর্কে",
  description: "শিশুদের ফ্যাশনে বাংলাদেশের একটি বিশ্বস্ত ব্র্যান্ড — নবজাতক থেকে ১২ বছর পর্যন্ত নরম, আরামদায়ক ও স্টাইলিশ পোশাক।",
};

const whyChooseUs = [
  { icon: FiShield, titleEn: "Skin-Friendly Fabric", titleBn: "ত্বক-বান্ধব কাপড়", descEn: "All our clothing is made from carefully selected soft and skin-friendly fabric. Completely safe for children's sensitive skin.", descBn: "আমাদের সকল পোশাক যত্নসহকারে নির্বাচিত নরম ও ত্বক-বান্ধব কাপড়ে তৈরি। শিশুদের সংবেদনশীল ত্বকের জন্য সম্পূর্ণ নিরাপদ।" },
  { icon: FiTruck, titleEn: "Fast Delivery", titleBn: "দ্রুত ডেলিভারি", descEn: "Fastest delivery across Bangladesh. Usually delivered to your door within 3–5 business days.", descBn: "সারা বাংলাদেশে দ্রুততম সময়ে ডেলিভারি। সাধারণত ৩–৫ কার্যদিবসের মধ্যে আপনার দোরগোড়ায়।" },
  { icon: FiStar, titleEn: "Affordable Price", titleBn: "সাশ্রয়ী মূল্য", descEn: "Premium quality children's clothing at the most affordable price — because every family deserves the best.", descBn: "প্রিমিয়াম মানের শিশু পোশাক সবচেয়ে সাশ্রয়ী মূল্যে — কারণ প্রতিটি পরিবারই সেরা পাওয়ার যোগ্য।" },
  { icon: FiSmile, titleEn: "Free Returns", titleBn: "ফ্রি রিটার্ন", descEn: "Size doesn't fit? No problem. Easy return and exchange policy — your complete satisfaction guaranteed.", descBn: "সাইজ মেলেনি? কোনো সমস্যা নেই। সহজ রিটার্ন ও এক্সচেঞ্জ পলিসি — আপনার সম্পূর্ণ সন্তুষ্টি নিশ্চিত।" },
];

const teamMembers = [
  { nameEn: "Rahim Uddin", nameBn: "রহিম উদ্দিন", roleEn: "Founder & CEO", roleBn: "প্রতিষ্ঠাতা ও প্রধান নির্বাহী", initials: "R" },
  { nameEn: "Sumaiya Begum", nameBn: "সুমাইয়া বেগম", roleEn: "Fashion Designer", roleBn: "ফ্যাশন ডিজাইনার", initials: "S" },
  { nameEn: "Karim Hossain", nameBn: "করিম হোসেন", roleEn: "Head of Sales & Marketing", roleBn: "বিক্রয় ও বিপণন প্রধান", initials: "K" },
  { nameEn: "Najma Akhtar", nameBn: "নাজমা আক্তার", roleEn: "Head of Customer Service", roleBn: "গ্রাহক সেবা প্রধান", initials: "N" },
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
              <TText en="Best for kids" bn="শিশুদের জন্য সেরা" />
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5"><TText en="About Us" bn="আমাদের সম্পর্কে" /></h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              <TText
                en="We are a trusted children's fashion brand in Bangladesh. From newborns to 12 years — soft, comfortable and stylish clothing for kids of every age."
                bn="আমরা বাংলাদেশের একটি বিশ্বস্ত শিশু ফ্যাশন ব্র্যান্ড। নবজাতক থেকে ১২ বছর — প্রতিটি বয়সের শিশুর জন্য নরম, আরামদায়ক ও স্টাইলিশ পোশাক।"
              />
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 section-heading"><TText en="Our Mission" bn="আমাদের লক্ষ্য" /></h2>
            <p className="text-text-body text-lg leading-relaxed mt-6">
              <TText
                en="Where style meets joy — kids shine like the sun. Our mission is to deliver superior quality, comfortable and affordable children's clothing to every family in Bangladesh."
                bn="যেখানে স্টাইল মিলিত হয় আনন্দে — শিশুরা ঝলমলিয়ে ওঠে সূর্যের মতো। আমাদের লক্ষ্য বাংলাদেশের প্রতিটি পরিবারের কাছে উন্নত মানের, আরামদায়ক ও সাশ্রয়ী মূল্যের শিশু পোশাক পৌঁছে দেওয়া।"
              />
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                { valueEn: "200+", valueBn: "২০০+", labelEn: "Fashion Items", labelBn: "ফ্যাশন আইটেম" },
                { valueEn: "10,000+", valueBn: "১০,০০০+", labelEn: "Happy Families", labelBn: "সন্তুষ্ট পরিবার" },
                { valueEn: "5+", valueBn: "৫+", labelEn: "Years of Experience", labelBn: "বছরের অভিজ্ঞতা" },
              ].map((stat) => (
                <div key={stat.labelBn} className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                  <p className="text-4xl font-bold text-primary mb-1"><TText en={stat.valueEn} bn={stat.valueBn} /></p>
                  <p className="text-text-muted font-medium"><TText en={stat.labelEn} bn={stat.labelBn} /></p>
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
                <TText en="Our Story" bn="আমাদের গল্প" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6"><TText en="How Our Journey Began" bn="কীভাবে শুরু হলো আমাদের যাত্রা" /></h2>
              <div className="space-y-4 text-text-body leading-relaxed">
                <p><TText en="Our journey started from a simple dream — to dress every child in the best clothing." bn="আমাদের যাত্রা শুরু হয়েছিল একটি সাধারণ স্বপ্ন থেকে — প্রতিটি শিশুকে সেরা পোশাকে সাজানো।" /></p>
                <p><TText en="Since our founding, we have used carefully selected soft, skin-friendly fabric." bn="প্রতিষ্ঠার পর থেকে আমরা যত্নসহকারে নির্বাচিত নরম, ত্বক-বান্ধব কাপড় ব্যবহার করে আসছি।" /></p>
                <p><TText en="Today we are proud that thousands of families trust us and dress their loved ones in our clothing." bn="আজ আমরা গর্বিত যে হাজার হাজার পরিবার আমাদের বিশ্বাস করেন এবং তাদের সোনামণিদের পরাচ্ছেন আমাদের পোশাক।" /></p>
              </div>
            </MotionFadeIn>
            <MotionFadeIn direction="left" delay={0.15}>
              <div className="bg-linear-to-br from-primary/10 to-primary/5 border border-primary/15 rounded-3xl p-8 md:p-10">
                <div className="text-center mb-8"><span className="text-7xl">👶</span></div>
                <div className="space-y-4">
                  {[
                    { yearEn: "2018", yearBn: "২০১৮", eventEn: "Brand established", eventBn: "আমাদের ব্র্যান্ড প্রতিষ্ঠা" },
                    { yearEn: "2020", yearBn: "২০২০", eventEn: "Online sales launched", eventBn: "অনলাইন বিক্রয় শুরু" },
                    { yearEn: "2022", yearBn: "২০২২", eventEn: "10,000 families milestone", eventBn: "১০,০০০ পরিবারের মাইলফলক" },
                    { yearEn: "2024", yearBn: "২০২৪", eventEn: "200+ fashion items collection", eventBn: "২০০+ ফ্যাশন আইটেমের কালেকশন" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg shrink-0 mt-0.5"><TText en={item.yearEn} bn={item.yearBn} /></span>
                      <p className="text-text-body text-sm"><TText en={item.eventEn} bn={item.eventBn} /></p>
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
            <h2 className="text-3xl md:text-4xl font-bold text-foreground section-heading"><TText en="Why Choose Us?" bn="কেন আমাদের বেছে নেবেন?" /></h2>
            <p className="text-text-muted mt-6 max-w-xl mx-auto"><TText en="We don't just sell clothing — we care about your child's comfort and style." bn="আমরা শুধু পোশাক বিক্রি করি না — আপনার সন্তানের আরাম ও স্টাইলের যত্ন নিই।" /></p>
          </MotionFadeIn>
          <MotionStaggerContainer staggerDelay={0.12} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map((item) => (
              <MotionStaggerItem key={item.titleBn} className="bg-white border border-border rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 mx-auto bg-primary/10 group-hover:bg-primary rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <item.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-foreground text-base mb-2"><TText en={item.titleEn} bn={item.titleBn} /></h3>
                <p className="text-text-muted text-sm leading-relaxed"><TText en={item.descEn} bn={item.descBn} /></p>
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
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3"><TText en="Our Team" bn="আমাদের দল" /></h2>
            <p className="text-white/70 max-w-xl mx-auto"><TText en="Our experienced and dedicated team is always at your service." bn="আমাদের অভিজ্ঞ ও নিবেদিতপ্রাণ দলটি সর্বদা আপনার সেবায় নিয়োজিত।" /></p>
          </MotionFadeIn>
          <MotionStaggerContainer staggerDelay={0.12} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <MotionStaggerItem key={member.nameBn} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/20 transition-colors">
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-white">{member.initials}</span>
                </div>
                <h3 className="font-bold text-white text-sm md:text-base"><TText en={member.nameEn} bn={member.nameBn} /></h3>
                <p className="text-white/60 text-xs mt-1"><TText en={member.roleEn} bn={member.roleBn} /></p>
              </MotionStaggerItem>
            ))}
          </MotionStaggerContainer>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import MotionFadeIn from "./MotionFadeIn";

interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  button_text?: string;
  button_url?: string;
  image?: string;
  gradient?: string;
  emoji?: string;
  position?: string;
}

const fallbackBanners: Banner[] = [
  { id: 1, title: "ঈদ কালেকশন", description: "ছোট্ট সোনামণিদের জন্য বিশেষ ঈদ পোশাক", button_text: "কালেকশন দেখুন", button_url: "/shop", gradient: "from-primary to-primary-dark", emoji: "🎉" },
  { id: 2, title: "নতুন আগমন", description: "এই সপ্তাহের ট্রেন্ডিং পোশাক", button_text: "শপ করুন", button_url: "/shop", gradient: "from-amber-600 to-amber-800", emoji: "👕" },
  { id: 3, title: "কম্বো অফার", description: "কম্বো প্যাকে বাঁচান বেশি", button_text: "অফার দেখুন", button_url: "/shop", gradient: "from-emerald-600 to-emerald-800", emoji: "📦" },
];

const defaultGradients = [
  "from-primary to-primary-dark",
  "from-amber-600 to-amber-800",
  "from-emerald-600 to-emerald-800",
  "from-purple-600 to-purple-800",
  "from-rose-600 to-rose-800",
];

export default function AdBanners({ banners }: { banners?: Banner[] }) {
  const items = banners && banners.length > 0 ? banners : fallbackBanners;
  const first = items[0];
  const rest = items.slice(1, 3); // max 3 banners in grid

  return (
    <section className="py-12 md:py-16 bg-background-alt">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Large banner */}
          <MotionFadeIn direction="right" className="md:row-span-2">
            <Link
              href={first.button_url || "/shop"}
              className={`group block h-full min-h-[280px] md:min-h-full bg-linear-to-br ${first.gradient || defaultGradients[0]} rounded-2xl p-8 text-white relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <span className="text-6xl md:text-7xl">{first.emoji || "🎁"}</span>
                  <h3 className="text-2xl md:text-3xl font-bold mt-4">{first.title}</h3>
                  <p className="text-white/70 mt-3 text-sm max-w-xs">{first.description || first.subtitle || ""}</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-white font-semibold group-hover:gap-3 transition-all">
                  {first.button_text || "দেখুন"}
                  <FiArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </MotionFadeIn>

          {/* Smaller banners */}
          {rest.map((banner, i) => (
            <MotionFadeIn key={banner.id} direction="left" delay={i * 0.1}>
              <Link
                href={banner.button_url || "/shop"}
                className={`group block bg-linear-to-br ${banner.gradient || defaultGradients[(i + 1) % defaultGradients.length]} rounded-2xl p-6 md:p-8 text-white relative overflow-hidden min-h-[180px]`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex items-center gap-4">
                  <span className="text-5xl">{banner.emoji || "📦"}</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{banner.title}</h3>
                    <p className="text-white/60 text-xs mt-1">{banner.description || banner.subtitle || ""}</p>
                    <div className="mt-3 inline-flex items-center gap-2 text-sm text-white font-semibold group-hover:gap-3 transition-all">
                      {banner.button_text || "দেখুন"}
                      <FiArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            </MotionFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

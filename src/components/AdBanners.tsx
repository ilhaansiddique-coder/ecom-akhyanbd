import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import MotionFadeIn from "./MotionFadeIn";
import T from "./T";

const banners = [
  {
    titleKey: "banner.gift.title",
    descKey: "banner.gift.desc",
    ctaKey: "banner.gift.cta",
    href: "/shop/gifts",
    gradient: "from-primary to-primary-dark",
    emoji: "🎁",
  },
  {
    titleKey: "banner.all.title",
    descKey: "banner.all.desc",
    ctaKey: "banner.all.cta",
    href: "/shop",
    gradient: "from-amber-600 to-amber-800",
    emoji: "🛒",
  },
  {
    titleKey: "banner.combo.title",
    descKey: "banner.combo.desc",
    ctaKey: "banner.combo.cta",
    href: "/shop/combo",
    gradient: "from-emerald-600 to-emerald-800",
    emoji: "📦",
  },
];

export default function AdBanners() {
  return (
    <section className="py-12 md:py-16 bg-background-alt">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <MotionFadeIn direction="right" className="md:row-span-2">
            <Link
              href={banners[0].href}
              className={`group block h-full min-h-[280px] md:min-h-full bg-linear-to-br ${banners[0].gradient} rounded-2xl p-8 text-white relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <span className="text-6xl md:text-7xl">{banners[0].emoji}</span>
                  <h3 className="text-2xl md:text-3xl font-bold mt-4"><T k={banners[0].titleKey} /></h3>
                  <p className="text-white/70 mt-3 text-sm max-w-xs"><T k={banners[0].descKey} /></p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-white font-semibold group-hover:gap-3 transition-all">
                  <T k={banners[0].ctaKey} />
                  <FiArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </MotionFadeIn>

          {banners.slice(1).map((banner, i) => (
            <MotionFadeIn key={banner.titleKey} direction="left" delay={i * 0.1}>
              <Link
                href={banner.href}
                className={`group block bg-linear-to-br ${banner.gradient} rounded-2xl p-6 md:p-8 text-white relative overflow-hidden min-h-[180px]`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex items-center gap-4">
                  <span className="text-5xl">{banner.emoji}</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold"><T k={banner.titleKey} /></h3>
                    <p className="text-white/60 text-xs mt-1"><T k={banner.descKey} /></p>
                    <div className="mt-3 inline-flex items-center gap-2 text-sm text-white font-semibold group-hover:gap-3 transition-all">
                      <T k={banner.ctaKey} />
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

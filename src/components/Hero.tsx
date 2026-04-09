import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiShield, FiTruck, FiStar } from "react-icons/fi";
import HeroFloatingTags from "./HeroFloatingTags";
import T from "./T";

export default function Hero() {
  return (
    <section className="relative bg-linear-to-br from-primary via-primary-light to-primary-dark overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-white/5 rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-28 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-[slide-up_0.6s_ease-out]">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 rounded-full text-white text-sm mb-6 backdrop-blur-sm animate-[slide-up_0.5s_ease-out_0.2s_both]">
              <FiStar className="w-4 h-4 text-yellow-300" />
              <T k="hero.badge" />
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
              <T k="hero.title" />
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-white/90 mt-2">
              <T k="hero.subtitle" />
            </p>

            <p className="mt-5 text-white/80 text-base md:text-lg max-w-lg leading-relaxed">
              <T k="hero.description" />
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link href="/shop" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-primary font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-lg group">
                <T k="hero.cta.buy" />
                <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/shop" className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">
                <T k="hero.cta.viewAll" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 mt-10">
              {([
                { icon: FiShield, key: "hero.trust.herbal" },
                { icon: FiTruck, key: "hero.trust.delivery" },
                { icon: FiStar, key: "hero.trust.rated" },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center gap-2 text-white/80">
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium"><T k={item.key} /></span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center animate-[slide-up_0.6s_ease-out_0.2s_both]">
            <div className="relative">
              <div className="w-80 h-80 xl:w-96 xl:h-96 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                <div className="w-64 h-64 xl:w-80 xl:h-80 bg-white/10 rounded-full flex items-center justify-center overflow-hidden">
                  <Image src="/logo.svg" alt="Ma Bhesoj" width={220} height={170} className="w-48 xl:w-56 drop-shadow-2xl" style={{ height: "auto" }} priority />
                </div>
              </div>
              <HeroFloatingTags />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

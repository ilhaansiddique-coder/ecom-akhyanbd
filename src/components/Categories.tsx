import Link from "next/link";
import MotionFadeIn from "./MotionFadeIn";
import { MotionStaggerContainer, MotionStaggerItem } from "./MotionStagger";
import LiveRefresh from "./LiveRefresh";
import T from "./T";

interface CategoryItem {
  name: string;
  slug: string;
  emoji: string;
  color: string;
}

interface CategoriesProps {
  categories: CategoryItem[];
}

export default function Categories({ categories }: CategoriesProps) {

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <MotionFadeIn className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground section-heading"><T k="categories.title" /></h2>
          <p className="text-text-muted mt-4"><T k="categories.subtitle" /></p>
        </MotionFadeIn>

        <LiveRefresh channel="categories" event=".category.changed">
          <MotionStaggerContainer staggerDelay={0.08} className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
            {categories.map((cat: { name: string; slug: string; emoji: string; color: string }) => (
              <MotionStaggerItem key={cat.name}>
                <Link href={cat.slug === "all" ? "/shop" : `/shop?category=${cat.slug}`} className="group flex flex-col items-center text-center">
                  <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-linear-to-br ${cat.color} flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 border border-border/50`}>
                    <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                </Link>
              </MotionStaggerItem>
            ))}
          </MotionStaggerContainer>
        </LiveRefresh>
      </div>
    </section>
  );
}

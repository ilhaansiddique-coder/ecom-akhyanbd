import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import type { Product } from "@/data/products";
import ProductCard from "./ProductCard";
import MotionFadeIn from "./MotionFadeIn";
import LiveRefresh from "./LiveRefresh";
import T from "./T";

interface LatestProductsProps {
  products: Product[];
}

export default function LatestProducts({ products }: LatestProductsProps) {

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <MotionFadeIn className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground section-heading"><T k="latest.title" /></h2>
            <p className="text-text-muted mt-4 text-sm"><T k="latest.subtitle" /></p>
          </div>
          <Link href="/shop" className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors group">
            <T k="viewAll" />
            <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </MotionFadeIn>

        <LiveRefresh channel="products" event=".product.changed">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {products.map((product, i) => (
              <MotionFadeIn key={product.id} delay={i * 0.08}>
                <ProductCard product={product} priority={i < 2} />
              </MotionFadeIn>
            ))}
          </div>
        </LiveRefresh>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors">
            <T k="viewAll" />
            <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

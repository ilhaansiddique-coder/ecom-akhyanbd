import Link from "next/link";
import { FiArrowRight, FiAward } from "react-icons/fi";
import type { Product } from "@/data/products";
import ProductCard from "./ProductCard";
import MotionFadeIn from "./MotionFadeIn";
import LiveRefresh from "./LiveRefresh";
import T from "./T";

interface TopRatedProductsProps {
  products: Product[];
}

export default function TopRatedProducts({ products }: TopRatedProductsProps) {

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <MotionFadeIn className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <FiAward className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground"><T k="topRated.title" /></h2>
              <p className="text-text-muted text-sm"><T k="topRated.subtitle" /></p>
            </div>
          </div>
          <Link href="/shop" className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-colors group">
            <T k="viewAll" />
            <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </MotionFadeIn>

        <LiveRefresh channel="products" event=".product.changed">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((product, i) => (
              <MotionFadeIn key={product.id} delay={i * 0.06}>
                <ProductCard product={product} />
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

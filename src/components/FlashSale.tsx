import type { Product } from "@/data/products";
import dynamic from "next/dynamic";

const FlashSaleClient = dynamic(() => import("./FlashSaleClient"), {
  loading: () => (
    <section className="py-12 md:py-16 bg-background-alt">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 bg-sale-red/10 rounded-xl w-11 h-11" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border h-80 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  ),
});

interface FlashSaleData {
  title: string;
  ends_at?: string;
  products: Product[];
}

interface FlashSaleProps {
  data: FlashSaleData | null;
}

export default function FlashSale({ data }: FlashSaleProps) {
  if (!data || data.products.length === 0) return null;
  return <FlashSaleClient title={data.title} endsAt={data.ends_at} products={data.products} />;
}

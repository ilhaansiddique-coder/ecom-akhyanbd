import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "সকল পণ্য",
  description: "আমাদের সকল পণ্য দেখুন।",
  openGraph: {
    title: "সকল পণ্য",
    description: "আমাদের সকল পণ্য দেখুন।",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}

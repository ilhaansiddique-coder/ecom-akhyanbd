import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "সকল পণ্য",
  description: "মা ভেষজ বাণিজ্যালয়ের সকল প্রাকৃতিক ভেষজ পণ্য দেখুন। ভেষজ গুঁড়ো, চা, হার্ট কেয়ার ও আরও অনেক কিছু।",
  openGraph: {
    title: "সকল পণ্য — মা ভেষজ বাণিজ্যালয়",
    description: "মা ভেষজ বাণিজ্যালয়ের সকল প্রাকৃতিক ভেষজ পণ্য দেখুন।",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}

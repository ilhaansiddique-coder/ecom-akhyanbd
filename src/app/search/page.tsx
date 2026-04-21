import { Suspense } from "react";
import SearchClient from "./SearchClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Results",
  description: "Search results for products in Akhiyan.",
};

export default function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Loading...</div>}>
      <SearchClient searchParams={searchParams} />
    </Suspense>
  );
}

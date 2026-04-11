"use client";

import { useState } from "react";
import { SafeNextImage } from "@/components/SafeImage";

interface ProductGalleryProps {
  mainImage: string;
  images: string[];
  alt: string;
}

export default function ProductGallery({ mainImage, images, alt }: ProductGalleryProps) {
  const allImages = [mainImage, ...images.filter((img) => img !== mainImage)];
  const [selected, setSelected] = useState(0);

  if (allImages.length <= 1) {
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-border">
        <SafeNextImage src={mainImage} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-border">
        <SafeNextImage src={allImages[selected]} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-colors ${selected === i ? "border-primary" : "border-border hover:border-primary/50"}`}
          >
            <SafeNextImage src={img} alt={`${alt} ${i + 1}`} fill className="object-cover" sizes="64px" />
          </button>
        ))}
      </div>
    </div>
  );
}

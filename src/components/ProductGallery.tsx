"use client";

import { useState } from "react";
import Image from "next/image";

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
        <Image src={mainImage} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority unoptimized={mainImage.includes("/storage/")} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-border">
        <Image src={allImages[selected]} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority unoptimized={allImages[selected].includes("/storage/")} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-colors ${selected === i ? "border-primary" : "border-border hover:border-primary/50"}`}
          >
            <Image src={img} alt={`${alt} ${i + 1}`} fill className="object-cover" sizes="64px" unoptimized={img.includes("/storage/")} />
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { SafeNextImage } from "@/components/SafeImage";

interface ProductGalleryProps {
  mainImage: string;
  images: string[];
  alt: string;
  overrideImage?: string;
}

export default function ProductGallery({ mainImage, images, alt, overrideImage }: ProductGalleryProps) {
  const allImages = [mainImage, ...images.filter((img) => img !== mainImage)];
  const [selected, setSelected] = useState(0);

  // When a variant image override comes in, show it as the main display
  const [variantImg, setVariantImg] = useState<string | undefined>(undefined);
  useEffect(() => {
    setVariantImg(overrideImage);
  }, [overrideImage]);

  const displayImage = variantImg || allImages[selected];

  const handleThumbClick = (i: number) => {
    setSelected(i);
    setVariantImg(undefined); // clear variant override when user picks a thumbnail
  };

  if (allImages.length <= 1 && !variantImg) {
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-border">
        <SafeNextImage src={displayImage} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-border">
        <SafeNextImage src={displayImage} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allImages.map((img, i) => (
          <button
            key={i}
            onClick={() => handleThumbClick(i)}
            className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-colors ${!variantImg && selected === i ? "border-primary" : "border-border hover:border-primary/50"}`}
          >
            <SafeNextImage src={img} alt={`${alt} ${i + 1}`} fill className="object-cover" sizes="64px" />
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

const PLACEHOLDER = "/placeholder.svg";

/**
 * SafeImage — drop-in replacement for next/image and <img>.
 * Automatically shows placeholder on error or missing src.
 */

// ─── For next/image (fill mode) ───
interface SafeNextImageProps extends Omit<ImageProps, "onError"> {
  fallback?: string;
}

export function SafeNextImage({ src, fallback = PLACEHOLDER, alt, ...props }: SafeNextImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallback);

  return (
    <Image
      {...props}
      src={imgSrc || fallback}
      alt={alt}
      onError={() => setImgSrc(fallback)}
      unoptimized
    />
  );
}

// ─── For native <img> (dashboard, simple cases) ───
interface SafeImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function SafeImg({ src, fallback = PLACEHOLDER, alt, ...props }: SafeImgProps) {
  const [imgSrc, setImgSrc] = useState(src || fallback);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={imgSrc || fallback}
      alt={alt || ""}
      onError={() => setImgSrc(fallback)}
    />
  );
}

/**
 * Helper: get safe image URL — returns placeholder if empty/null/undefined.
 * Use this in data mappers or when passing image to other components.
 */
export function safeImageUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") return PLACEHOLDER;
  return url;
}

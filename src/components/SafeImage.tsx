"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect } from "react";

const PLACEHOLDER = "/placeholder.svg";

// Gray blur placeholder
const BLUR_DATA_URL = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlZWUiLz48L3N2Zz4=";

// ─── For next/image (fill mode) ───
interface SafeNextImageProps extends Omit<ImageProps, "onError"> {
  fallback?: string;
}

export function SafeNextImage({ src, fallback = PLACEHOLDER, alt, ...props }: SafeNextImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallback);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src || fallback);
    setHasError(false);
  }, [src, fallback]);

  const isSvg = typeof imgSrc === "string" && imgSrc.endsWith(".svg");
  // Runtime-uploaded files live outside the standalone build's static bundle,
  // so the Next image optimizer can't read them from disk. Skip optimization
  // for /uploads/* — browser fetches the URL directly, which the next.config
  // fallback rewrite serves via /api/uploads/*.
  const isUpload =
    typeof imgSrc === "string" &&
    (imgSrc.startsWith("/uploads/") || imgSrc.startsWith("/storage/"));
  const skipOptimize = isSvg || isUpload;

  return (
    <Image
      {...props}
      src={imgSrc || fallback}
      alt={alt || ""}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallback);
        }
      }}
      {...(!skipOptimize ? { placeholder: "blur", blurDataURL: BLUR_DATA_URL } : {})}
      unoptimized={skipOptimize}
    />
  );
}

// ─── For native <img> (dashboard, simple cases) ───
interface SafeImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function SafeImg({ src, fallback = PLACEHOLDER, alt, ...props }: SafeImgProps) {
  const [imgSrc, setImgSrc] = useState(src || fallback);

  useEffect(() => {
    setImgSrc(src || fallback);
  }, [src, fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={imgSrc || fallback}
      alt={alt || ""}
      onError={() => setImgSrc(fallback)}
      loading="lazy"
      decoding="async"
    />
  );
}

export function safeImageUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") return PLACEHOLDER;
  return url;
}

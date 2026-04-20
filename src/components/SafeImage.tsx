"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect } from "react";

const PLACEHOLDER = "/placeholder.svg";

// Rewrite legacy `/uploads/*` + `/storage/*` paths to the Cloudflare CDN
// at render time so HTML emits direct CDN URLs. Without this, browser hits
// Next server which 308-redirects to R2 — one extra round-trip per image.
// When CDN env is not set, URLs stay local (handled by server rewrites).
const CDN = (process.env.NEXT_PUBLIC_CDN_URL || "").replace(/\/$/, "");
function toCdn(src: unknown): string | undefined {
  if (typeof src !== "string" || !src || !CDN) return src as string | undefined;
  if (src.startsWith("/uploads/")) return CDN + src.replace(/^\/uploads/, "");
  if (src.startsWith("/storage/uploads/")) return CDN + src.replace(/^\/storage\/uploads/, "");
  if (src.startsWith("/storage/")) return CDN + src.replace(/^\/storage/, "");
  return src;
}

// Gray blur placeholder
const BLUR_DATA_URL = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlZWUiLz48L3N2Zz4=";

// ─── For next/image (fill mode) ───
interface SafeNextImageProps extends Omit<ImageProps, "onError"> {
  fallback?: string;
}

export function SafeNextImage({ src, fallback = PLACEHOLDER, alt, ...props }: SafeNextImageProps) {
  const [imgSrc, setImgSrc] = useState<ImageProps["src"]>(toCdn(src) || fallback);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(toCdn(src) || fallback);
    setHasError(false);
  }, [src, fallback]);

  const isSvg = typeof imgSrc === "string" && imgSrc.endsWith(".svg");
  // Skip Next image optimizer for local /uploads/* paths (no disk on standalone)
  // AND for direct CDN URLs — CDN already serves optimized WebP, going through
  // /_next/image would add a proxy hop and defeat edge caching.
  const srcStr = typeof imgSrc === "string" ? imgSrc : "";
  const isUpload = srcStr.startsWith("/uploads/") || srcStr.startsWith("/storage/");
  const isCdn = !!CDN && srcStr.startsWith(CDN);
  const skipOptimize = isSvg || isUpload || isCdn;

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
  const [imgSrc, setImgSrc] = useState(toCdn(src) || fallback);

  useEffect(() => {
    setImgSrc(toCdn(src) || fallback);
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
  return toCdn(url) || url;
}

"use client";

import { useEffect } from "react";

interface ImagePreloaderProps {
  images: string[];
  priority?: boolean;
}

/**
 * Preloads images in the browser to make them load instantly
 * Uses browser's native preloading capabilities
 */
export function ImagePreloader({ images, priority = false }: ImagePreloaderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Preload images using link rel="preload"
    const links: HTMLLinkElement[] = [];

    images.forEach((src) => {
      if (!src || src === "/placeholder.svg") return;

      const link = document.createElement("link");
      link.rel = priority ? "preload" : "prefetch";
      link.as = "image";
      link.href = src.startsWith("/") ? src : `/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`;

      // For AVIF/WebP support
      if (!src.endsWith(".svg")) {
        link.type = "image/avif";
      }

      document.head.appendChild(link);
      links.push(link);
    });

    // Cleanup
    return () => {
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [images, priority]);

  return null;
}

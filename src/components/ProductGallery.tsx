"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { SafeNextImage } from "@/components/SafeImage";

/**
 * Product image gallery for the PDP.
 *
 * - Main image up top, scrollable thumbnail strip beneath it.
 * - Click a thumb → main image swaps with a smooth crossfade.
 * - For variable products: variant images are folded into the same strip
 *   so users see ALL imagery (product extras + per-variant photos) without
 *   having to scroll the variant picker. When a variant is picked elsewhere
 *   on the page (AddToCart panel) `overrideImage` updates and the matching
 *   thumb auto-selects.
 * - Duplicate images (e.g. variant.image == product.image) collapse to one
 *   thumb. Order: main image → product extras → variant images by sortOrder.
 */
interface VariantImage {
  id?: number;
  image: string;
  label?: string;
}

interface ProductGalleryProps {
  mainImage: string;
  images: string[];
  alt: string;
  overrideImage?: string;
  /** Optional variant image list — only meaningful for variable products. */
  variantImages?: VariantImage[];
}

export default function ProductGallery({
  mainImage,
  images,
  alt,
  overrideImage,
  variantImages,
}: ProductGalleryProps) {
  // Build the unified gallery list once per prop change. Dedupe by URL so
  // a variant.image that matches mainImage doesn't render twice.
  const allImages = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (url: string | null | undefined) => {
      if (!url) return;
      if (seen.has(url)) return;
      seen.add(url);
      out.push(url);
    };
    push(mainImage);
    for (const img of images) push(img);
    for (const v of variantImages || []) push(v.image);
    return out;
  }, [mainImage, images, variantImages]);

  const [selected, setSelected] = useState(0);
  // Fullscreen lightbox state. Tap main image → opens. ESC / × / overlay
  // click → closes. Body scroll is locked while open so the page doesn't
  // bleed through behind the modal.
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Sync selection to variant override (when AddToCart picks a variant elsewhere).
  useEffect(() => {
    if (!overrideImage) return;
    const idx = allImages.indexOf(overrideImage);
    if (idx >= 0) setSelected(idx);
  }, [overrideImage, allImages]);

  // Reset selection if the underlying list shrinks below current index
  // (e.g. images change after admin edit).
  useEffect(() => {
    if (selected >= allImages.length) setSelected(0);
  }, [allImages.length, selected]);

  // ── Lightbox keyboard + body-scroll handling ──
  useEffect(() => {
    if (!lightboxOpen) return;
    // Save + restore overflow so we don't fight other scroll-lock systems.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") setSelected((i) => Math.min(allImages.length - 1, i + 1));
      if (e.key === "ArrowLeft") setSelected((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, allImages.length]);

  const displayImage = allImages[selected] ?? mainImage;

  // Main-image click handler — opens the fullscreen lightbox at the
  // currently selected image. Pulled out so both single + multi-image
  // branches reuse it and the cursor styling stays consistent.
  const onMainClick = () => setLightboxOpen(true);

  // No thumbnails needed when there's just one image.
  if (allImages.length <= 1) {
    return (
      <>
        <button
          type="button"
          onClick={onMainClick}
          aria-label="Open image fullscreen"
          className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-border block cursor-zoom-in"
        >
          <SafeNextImage
            src={displayImage}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </button>
        <Lightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={allImages}
          alt={alt}
          selected={selected}
          setSelected={setSelected}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image — AnimatePresence crossfades between selections so the
          swap feels smooth instead of an instant pop. mode="wait" makes the
          outgoing image finish fading before the new one starts. Wrapped in
          a button so click opens the fullscreen lightbox. */}
      <button
        type="button"
        onClick={onMainClick}
        aria-label="Open image fullscreen"
        className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-border block cursor-zoom-in"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={displayImage}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <SafeNextImage
              src={displayImage}
              alt={alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Thumbnail strip — horizontal scroll on overflow. Active thumb gets
          the primary-color border; inactive thumbs get a subtle hover ring. */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {allImages.map((img, i) => {
          const isActive = selected === i;
          return (
            <button
              key={`${i}-${img}`}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`Show image ${i + 1}`}
              className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-150 ${
                isActive
                  ? "border-[var(--primary)] shadow-sm"
                  : "border-border hover:border-[var(--primary)]/50"
              }`}
            >
              <SafeNextImage
                src={img}
                alt={`${alt} ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          );
        })}
      </div>

      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={allImages}
        alt={alt}
        selected={selected}
        setSelected={setSelected}
      />
    </div>
  );
}

/**
 * Fullscreen image lightbox. Black overlay, image scaled with object-contain
 * so it never crops, close button top-right, prev/next nav buttons + arrow
 * keys when there's more than one image. Backdrop click also closes (image
 * area uses stopPropagation so clicking the photo itself doesn't dismiss).
 */
function Lightbox({
  open,
  onClose,
  images,
  alt,
  selected,
  setSelected,
}: {
  open: boolean;
  onClose: () => void;
  images: string[];
  alt: string;
  selected: number;
  setSelected: (i: number | ((prev: number) => number)) => void;
}) {
  const hasMany = images.length > 1;
  const current = images[selected] ?? images[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 sm:p-8"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          {/* Close button — fixed top-right, white-on-black with a subtle
              hit-area expansion so it's tappable on small screens. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>

          {/* Counter — small text bottom-center so user knows their position
              in a multi-image set. */}
          {hasMany && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium">
              {selected + 1} / {images.length}
            </div>
          )}

          {/* Prev / Next nav — only shown when there's more than one image. */}
          {hasMany && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelected((i) => Math.max(0, i - 1)); }}
                disabled={selected === 0}
                aria-label="Previous image"
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FiChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelected((i) => Math.min(images.length - 1, i + 1)); }}
                disabled={selected === images.length - 1}
                aria-label="Next image"
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FiChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image — object-contain so it scales to fit the viewport without
              cropping. Crossfade between siblings via key change. The
              stopPropagation prevents click-on-photo from dismissing. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full h-full max-w-5xl max-h-full"
            >
              <SafeNextImage
                src={current}
                alt={alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

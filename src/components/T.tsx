"use client";

import { useLang } from "@/lib/LanguageContext";
import { toBn } from "@/utils/toBn";

/** Inline translation component for use inside server components.
 *  Usage: <T k="hero.title" /> or <T k="hero.title" tag="h1" className="..." />
 */
export default function T({ k, tag: Tag, className }: { k: string; tag?: "h1" | "h2" | "h3" | "h4" | "p" | "span"; className?: string }) {
  const { t } = useLang();
  if (Tag) return <Tag className={className}>{t(k)}</Tag>;
  return <>{t(k)}</>;
}

/** Returns number formatted per current language (Bangla digits or English) */
export function TNum({ value }: { value: number | string }) {
  const { lang } = useLang();
  return <>{toBn(value)}</>;
}

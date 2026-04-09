"use client";

import { useLang } from "@/lib/LanguageContext";

/** Inline SVG flags — no external assets needed */
function BDFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 5 3" className={className} aria-hidden="true">
      <rect width="5" height="3" fill="#006a4e" />
      <circle cx="2.25" cy="1.5" r="0.9" fill="#f42a41" />
    </svg>
  );
}

function GBFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden="true">
      <clipPath id="s"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <g clipPath="url(#s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

interface LanguageToggleProps {
  compact?: boolean;
}

export default function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { lang, setLang } = useLang();

  const toggle = () => setLang(lang === "bn" ? "en" : "bn");

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
        aria-label={lang === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
        title={lang === "bn" ? "English" : "বাংলা"}
      >
        {lang === "bn" ? (
          <GBFlag className="w-5 h-3.5 rounded-[2px] border border-black/10" />
        ) : (
          <BDFlag className="w-5 h-3.5 rounded-[2px] border border-black/10" />
        )}
        <span className="text-xs font-semibold text-foreground hidden sm:inline">
          {lang === "bn" ? "EN" : "BN"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border hover:bg-background-alt transition-colors"
      aria-label={lang === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
    >
      {lang === "bn" ? (
        <>
          <GBFlag className="w-5 h-3.5 rounded-[2px] border border-black/10" />
          <span className="text-xs font-semibold text-foreground">English</span>
        </>
      ) : (
        <>
          <BDFlag className="w-5 h-3.5 rounded-[2px] border border-black/10" />
          <span className="text-xs font-semibold text-foreground">বাংলা</span>
        </>
      )}
    </button>
  );
}

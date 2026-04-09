"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LanguageContext";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const accepted = localStorage.getItem("cookie_consent");
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-border shadow-2xl animate-[slide-up_0.3s_ease-out]">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-text-body text-center sm:text-left">
          {t("cookie.message")}{" "}
          <Link href="/privacy" className="text-primary font-medium hover:underline">{t("footer.privacy")}</Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button onClick={accept} className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors">
            {t("cookie.accept")}
          </button>
          <button onClick={() => setVisible(false)} className="px-5 py-2 border border-border text-text-muted text-sm rounded-lg hover:bg-background-alt transition-colors">
            {t("cookie.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { FaWhatsapp } from "react-icons/fa";
import { useSiteSettings } from "@/lib/SiteSettingsContext";

export default function FloatingWidgets() {
  const settings = useSiteSettings();
  // Try whatsapp field first, then phone as fallback
  const raw = settings.whatsapp || settings.phone || settings.contact_phone || "";
  const whatsapp = raw.replace(/[^0-9]/g, "");

  if (!whatsapp) return null;

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
      aria-label="WhatsApp"
    >
      <FaWhatsapp className="w-7 h-7" />
    </a>
  );
}

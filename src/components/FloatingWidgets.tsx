"use client";

import { useState } from "react";
import { FaFacebookF, FaInstagram, FaYoutube, FaWhatsapp, FaPhoneAlt } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { useLang } from "@/lib/LanguageContext";

export default function FloatingWidgets() {
  const [contactVisible, setContactVisible] = useState(true);
  const { t } = useLang();

  return (
    <>
      {/* Social Media Buttons - Right Side */}
      <div className="fixed right-0 top-1/3 z-40 flex flex-col">
        {[
          {
            icon: FaFacebookF,
            href: "https://www.facebook.com/mavesoj",
            bg: "bg-facebook",
            hoverBg: "hover:bg-[#2d4373]",
            labelKey: "widget.facebook" as const,
            delay: "0.5s",
          },
          {
            icon: FaInstagram,
            href: "https://www.instagram.com/mavesoj",
            bg: "bg-instagram",
            hoverBg: "hover:bg-[#6d2d99]",
            labelKey: "widget.instagram" as const,
            delay: "0.6s",
          },
          {
            icon: FaYoutube,
            href: "https://www.youtube.com/@mavesoj",
            bg: "bg-youtube",
            hoverBg: "hover:bg-[#a31717]",
            labelKey: "widget.youtube" as const,
            delay: "0.7s",
          },
        ].map((social) => (
          <a
            key={social.labelKey}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center ${social.bg} ${social.hoverBg} text-white transition-all duration-300 animate-[slide-in-right_0.4s_ease-out_both]`}
            style={{ animationDelay: social.delay }}
            aria-label={t(social.labelKey)}
          >
            {/* Tooltip */}
            <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] group-hover:px-3 transition-all duration-300 text-sm font-medium whitespace-nowrap">
              {t(social.labelKey)}
            </span>
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <social.icon className="w-4.5 h-4.5" />
            </div>
          </a>
        ))}
      </div>

      {/* Contact Buttons - Bottom Right */}
      {contactVisible && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
          {/* WhatsApp */}
          <a
            href="https://wa.me/8801731492117"
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 bg-whatsapp rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 animate-[scale-in_0.4s_ease-out_0.8s_both]"
            style={{ animation: "scale-in 0.4s ease-out 0.8s both, pulse-ring 2s ease-out infinite" }}
            aria-label={t("widget.whatsapp")}
          >
            <FaWhatsapp className="w-7 h-7" />
          </a>

          {/* Phone */}
          <a
            href="tel:+8801731492117"
            className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 animate-[scale-in_0.4s_ease-out_0.9s_both]"
            aria-label={t("widget.phone")}
          >
            <FaPhoneAlt className="w-6 h-6" />
          </a>

          {/* Hide button */}
          <button
            onClick={() => setContactVisible(false)}
            className="px-4 py-1.5 bg-white text-text-muted text-sm rounded-full shadow-md hover:shadow-lg hover:text-foreground transition-all border border-border animate-[scale-in_0.4s_ease-out_1s_both]"
          >
            {t("widget.hide")}
          </button>

          {/* Close button */}
          <button
            onClick={() => setContactVisible(false)}
            className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-purple-600 hover:scale-110 transition-all animate-[scale-in_0.4s_ease-out_1.1s_both]"
            aria-label={t("widget.close")}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Show button when hidden */}
      {!contactVisible && (
        <button
          onClick={() => setContactVisible(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-whatsapp rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all"
          style={{ animation: "scale-in 0.3s ease-out both, pulse-ring 2s ease-out infinite" }}
          aria-label={t("widget.showContact")}
        >
          <FaWhatsapp className="w-7 h-7" />
        </button>
      )}
    </>
  );
}

"use client";

import { FaWhatsapp, FaFacebookMessenger } from "react-icons/fa";
import { FiPhone } from "react-icons/fi";
import { useSiteSettings, useOption } from "@/lib/SiteSettingsContext";

export default function FloatingWidgets() {
  const settings = useSiteSettings();
  // Legacy key — now controls the *primary* contact bubble (WhatsApp or Phone).
  const showPrimary   = useOption<boolean>("widget.show_whatsapp");
  const contactMode   = useOption<string>("widget.contact_mode"); // "whatsapp" | "phone"
  const showPhone     = useOption<boolean>("widget.show_phone");
  const showMessenger = useOption<boolean>("widget.show_messenger");
  const position      = useOption<string>("widget.position"); // bottom_right | bottom_left

  const rawPhone = settings.whatsapp || settings.phone || settings.contact_phone || "";
  const whatsappDigits = rawPhone.replace(/[^0-9]/g, "");
  const phoneNumber    = settings.phone || settings.whatsapp || settings.contact_phone || "";
  const messengerUrl = settings.facebook
    ? settings.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, "https://m.me/")
    : "";

  // Build the channel list, skipping anything missing data or toggled off.
  const channels: { key: string; href: string; label: string; bg: string; icon: React.ComponentType<{ className?: string }> }[] = [];

  if (showPrimary) {
    if (contactMode === "phone" && phoneNumber) {
      channels.push({ key: "primary-phone", href: `tel:${phoneNumber.replace(/\s/g, "")}`, label: "Call us", bg: "bg-[#25D366]", icon: FiPhone });
    } else if (contactMode !== "phone" && whatsappDigits) {
      channels.push({ key: "primary-whatsapp", href: `https://wa.me/${whatsappDigits}`, label: "WhatsApp", bg: "bg-[#25D366]", icon: FaWhatsapp });
    }
  }

  if (showMessenger && messengerUrl)
    channels.push({ key: "messenger", href: messengerUrl, label: "Messenger", bg: "bg-[#0084FF]", icon: FaFacebookMessenger });

  // Suppress the secondary phone bubble when the primary is already a phone bubble.
  const primaryIsPhone = showPrimary && contactMode === "phone";
  if (showPhone && phoneNumber && !primaryIsPhone)
    channels.push({ key: "phone", href: `tel:${phoneNumber.replace(/\s/g, "")}`, label: "Phone", bg: "bg-primary", icon: FiPhone });

  if (channels.length === 0) return null;

  const sideClass = position === "bottom_left" ? "left-6" : "right-6";

  return (
    <div className={`fixed bottom-6 ${sideClass} z-40 flex flex-col gap-3`}>
      {channels.map((c) => {
        const Icon = c.icon;
        const isExternal = c.href.startsWith("http");
        return (
          <a
            key={c.key}
            href={c.href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className={`w-14 h-14 ${c.bg} rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300`}
            aria-label={c.label}
          >
            <Icon className="w-7 h-7" />
          </a>
        );
      })}
    </div>
  );
}

"use client";

import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import MotionFadeIn from "./MotionFadeIn";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import { useLang } from "@/lib/LanguageContext";

export default function ContactInfo() {
  const settings = useSiteSettings();
  const { lang } = useLang();
  const en = lang === "en";

  const phone = settings.phone || "";
  const email = settings.email || "";
  const address = settings.address || "";
  const facebook = settings.facebook || "";
  const instagram = settings.instagram || "";
  const youtube = settings.youtube || "";
  const mapEmbed = settings.map_embed || "";

  const socials = [
    ...(facebook ? [{ icon: FaFacebookF, href: facebook, label: en ? "Facebook Page" : "ফেসবুক পেজ", color: "#3b5998" }] : []),
    ...(instagram ? [{ icon: FaInstagram, href: instagram, label: en ? "Instagram" : "ইনস্টাগ্রাম", color: "#8a3ab9" }] : []),
    ...(youtube ? [{ icon: FaYoutube, href: youtube, label: en ? "YouTube Channel" : "ইউটিউব চ্যানেল", color: "#cd201f" }] : []),
  ];

  return (
    <div className="space-y-6">
      <MotionFadeIn delay={0.1}>
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-5">{en ? "Contact Info" : "যোগাযোগের তথ্য"}</h3>
          <div className="space-y-4">
            {address && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <FiMapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-muted font-medium mb-0.5">{en ? "Address" : "ঠিকানা"}</p>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="text-foreground text-sm font-semibold hover:text-primary transition-colors">{address}</a>
                </div>
              </div>
            )}
            {phone && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <FiPhone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-muted font-medium mb-0.5">{en ? "Phone" : "ফোন"}</p>
                  <a href={`tel:${phone}`} className="text-foreground text-sm font-semibold hover:text-primary transition-colors">{phone}</a>
                  <p className="text-text-muted text-xs mt-0.5">{en ? "9 AM — 9 PM" : "সকাল ৯টা — রাত ৯টা"}</p>
                </div>
              </div>
            )}
            {email && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <FiMail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-muted font-medium mb-0.5">{en ? "Email" : "ইমেইল"}</p>
                  <a href={`mailto:${email}`} className="text-foreground text-sm font-semibold hover:text-primary transition-colors break-all">{email}</a>
                  <p className="text-text-muted text-xs mt-0.5">{en ? "Reply within 24 hours" : "২৪ ঘণ্টার মধ্যে উত্তর"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </MotionFadeIn>

      {socials.length > 0 && (
        <MotionFadeIn delay={0.2}>
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">{en ? "Social Media" : "সামাজিক মাধ্যম"}</h3>
            <div className="space-y-3">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 border rounded-xl transition-colors group" style={{ borderColor: `${s.color}33`, backgroundColor: `${s.color}08` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color }}>
                    <s.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{s.label}</span>
                </a>
              ))}
            </div>
          </div>
        </MotionFadeIn>
      )}

      {mapEmbed && (
        <MotionFadeIn delay={0.3}>
          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
            <iframe
              src={mapEmbed}
              width="100%"
              height="200"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={en ? "Location" : "অবস্থান"}
              className="w-full"
            />
          </div>
        </MotionFadeIn>
      )}
    </div>
  );
}

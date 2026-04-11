"use client";

import { FaWhatsapp } from "react-icons/fa";

export default function FloatingWidgets() {
  return (
    <a
      href="https://wa.me/8801731492117"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
      aria-label="WhatsApp"
    >
      <FaWhatsapp className="w-7 h-7" />
    </a>
  );
}

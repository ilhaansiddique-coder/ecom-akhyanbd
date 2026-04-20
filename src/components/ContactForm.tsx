"use client";

import { useState } from "react";
import { FiSend } from "react-icons/fi";
import { trackLead } from "@/lib/analytics";
import InlineSelect from "@/components/InlineSelect";
import { useLang } from "@/lib/LanguageContext";

const API_URL = "/api/v1";

export default function ContactForm() {
  const { lang } = useLang();
  const en = lang === "en";
  const subjectOptions = [
    { value: "order",    label: en ? "Order related" : "অর্ডার সংক্রান্ত" },
    { value: "product",  label: en ? "Product related" : "পণ্য সংক্রান্ত" },
    { value: "delivery", label: en ? "Delivery related" : "ডেলিভারি সংক্রান্ত" },
    { value: "refund",   label: en ? "Refund related" : "রিফান্ড সংক্রান্ত" },
    { value: "other",    label: en ? "Other" : "অন্যান্য" },
  ];
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.subject) { setError(en ? "Please select a subject." : "বিষয় নির্বাচন করুন।"); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      trackLead({ em: formData.email, ph: formData.phone, fn: formData.name });
    } catch {
      setError(en ? "Failed to send message. Please try again." : "বার্তা পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 animate-[slide-up_0.3s_ease-out]">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiSend className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{en ? "Message sent!" : "বার্তা পাঠানো হয়েছে!"}</h3>
        <p className="text-text-muted">{en ? "Your message has been sent. We'll get back to you shortly." : "আপনার বার্তা সফলভাবে পাঠানো হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।"}</p>
        <button
          onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", phone: "", subject: "", message: "" }); }}
          className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          {en ? "Send another message" : "আরেকটি বার্তা পাঠান"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? "Name" : "নাম"} <span className="text-sale-red">*</span></label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder={en ? "Your full name" : "আপনার পূর্ণ নাম"} className="w-full px-4 py-3 border border-border rounded-xl text-foreground placeholder:text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? "Email" : "ইমেইল"} <span className="text-sale-red">*</span></label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="your@email.com" className="w-full px-4 py-3 border border-border rounded-xl text-foreground placeholder:text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? "Phone" : "ফোন"}</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="017XXXXXXXX" className="w-full px-4 py-3 border border-border rounded-xl text-foreground placeholder:text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? "Subject" : "বিষয়"} <span className="text-sale-red">*</span></label>
          <InlineSelect
            fullWidth
            absolute
            value={formData.subject}
            options={subjectOptions}
            placeholder={en ? "Select subject" : "বিষয় নির্বাচন করুন"}
            onChange={(val) => setFormData((prev) => ({ ...prev, subject: val }))}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? "Message" : "বার্তা"} <span className="text-sale-red">*</span></label>
        <textarea name="message" value={formData.message} onChange={handleChange} required rows={5} placeholder={en ? "Write your message here..." : "আপনার বার্তা এখানে লিখুন..."} className="w-full px-4 py-3 border border-border rounded-xl text-foreground placeholder:text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
      </div>
      {error && <p className="text-sale-red text-sm">{error}</p>}
      <button type="submit" disabled={sending} className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors shadow-sm hover:shadow-md disabled:opacity-50">
        <FiSend className="w-4 h-4" />
        {sending ? (en ? "Sending..." : "পাঠানো হচ্ছে...") : (en ? "Send" : "পাঠান")}
      </button>
    </form>
  );
}

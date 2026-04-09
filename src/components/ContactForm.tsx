"use client";

import { useState } from "react";
import { FiSend } from "react-icons/fi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    } catch {
      setError("বার্তা পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
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
        <h3 className="text-xl font-bold text-foreground mb-2">বার্তা পাঠানো হয়েছে!</h3>
        <p className="text-text-muted">আপনার বার্তা সফলভাবে পাঠানো হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
        <button
          onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", phone: "", subject: "", message: "" }); }}
          className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
        >
          আরেকটি বার্তা পাঠান
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">নাম <span className="text-sale-red">*</span></label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="আপনার পূর্ণ নাম" className="w-full px-4 py-3 border border-border rounded-xl text-foreground placeholder:text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">ইমেইল <span className="text-sale-red">*</span></label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="your@email.com" className="w-full px-4 py-3 border border-border rounded-xl text-foreground placeholder:text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">ফোন</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+880 1731492117" className="w-full px-4 py-3 border border-border rounded-xl text-foreground placeholder:text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">বিষয় <span className="text-sale-red">*</span></label>
          <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full px-4 py-3 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white">
            <option value="">বিষয় নির্বাচন করুন</option>
            <option value="order">অর্ডার সংক্রান্ত</option>
            <option value="product">পণ্য সংক্রান্ত</option>
            <option value="delivery">ডেলিভারি সংক্রান্ত</option>
            <option value="refund">রিফান্ড সংক্রান্ত</option>
            <option value="other">অন্যান্য</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">বার্তা <span className="text-sale-red">*</span></label>
        <textarea name="message" value={formData.message} onChange={handleChange} required rows={5} placeholder="আপনার বার্তা এখানে লিখুন..." className="w-full px-4 py-3 border border-border rounded-xl text-foreground placeholder:text-text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
      </div>
      {error && <p className="text-sale-red text-sm">{error}</p>}
      <button type="submit" disabled={sending} className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors shadow-sm hover:shadow-md disabled:opacity-50">
        <FiSend className="w-4 h-4" />
        {sending ? "পাঠানো হচ্ছে..." : "পাঠান"}
      </button>
    </form>
  );
}

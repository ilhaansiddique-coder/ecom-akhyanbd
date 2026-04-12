"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiCheck, FiStar, FiChevronDown, FiMinus, FiPlus, FiPhone } from "react-icons/fi";
import { SafeImg, SafeNextImage } from "@/components/SafeImage";
import { api } from "@/lib/api";

interface Product {
  id: number; name: string; slug: string; price: number; original_price?: number;
  image: string; description?: string; stock: number; selected_quantity: number;
}

interface PageData {
  id: number; slug: string; title: string;
  hero_headline?: string; hero_subheadline?: string; hero_image?: string;
  hero_cta?: string; hero_trust_text?: string; hero_badge?: string;
  problem_title?: string; problem_points?: string;
  features?: string; testimonials?: string; how_it_works?: string; faq?: string;
  products?: string; products_title?: string; products_subtitle?: string; products_sub?: string;
  features_title?: string; testimonials_title?: string; testimonials_mode?: string;
  how_it_works_title?: string; how_it_works_subtitle?: string; how_it_works_sub?: string;
  faq_title?: string;
  checkout_title?: string; checkout_subtitle?: string;
  checkout_btn_text?: string; custom_shipping?: boolean; shipping_cost?: number;
  show_email?: boolean; show_city?: boolean;
  guarantee_text?: string; success_message?: string;
  whatsapp?: string;
  primary_color?: string; resolved_products?: Product[];
}

function parseJSON<T>(str?: string | null): T[] {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

export default function LandingPageClient({ page }: { page: PageData }) {
  const router = useRouter();
  const color = page.primary_color || "#0f5931";

  const products = page.resolved_products || [];
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(products.map((p) => [p.id, p.selected_quantity || 1]))
  );
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [shippingZones, setShippingZones] = useState<{ id: number; name: string; rate: number; estimated_days?: string }[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  // Fetch shipping zones on mount (skip if custom shipping)
  useEffect(() => {
    if (page.custom_shipping) return;
    fetch("/api/v1/shipping/zones").then((r) => r.json()).then((data) => {
      const zones = (Array.isArray(data) ? data : []).map((z: Record<string, unknown>) => ({
        id: z.id as number,
        name: z.name as string,
        rate: Number(z.rate),
        estimated_days: (z.estimated_days as string) || "",
      }));
      setShippingZones(zones);
      if (zones.length > 0) setSelectedZone(zones[0].id);
    }).catch(() => {});
  }, []);

  const problemPointsRaw = parseJSON<any>(page.problem_points);
  const problemPoints = problemPointsRaw.map((p: any) => typeof p === "string" ? { text: p, icon: "" } : { text: p.text || "", icon: p.icon || "" });
  const features = parseJSON<{ icon?: string; title: string; description: string }>(page.features);
  const [allSiteReviews, setAllSiteReviews] = useState<{ name: string; review: string; rating: number; image?: string }[]>([]);
  const parsedTestimonials = parseJSON<{ name: string; review: string; rating: number; image?: string }>(page.testimonials);

  // Fetch all site reviews if mode is "all_site"
  useEffect(() => {
    if (page.testimonials_mode === "all_site") {
      fetch("/api/v1/reviews/approved").then(r => r.json()).then(data => {
        setAllSiteReviews((Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => ({
          name: (r.customer_name as string) || "", review: (r.review as string) || "",
          rating: Number(r.rating) || 5, image: (r.image as string) || "",
        })));
      }).catch(() => {});
    }
  }, [page.testimonials_mode]);

  const testimonials = page.testimonials_mode === "all_site" ? allSiteReviews : parsedTestimonials;
  const howItWorks = parseJSON<{ title: string; description: string }>(page.how_it_works);
  const faqItems = parseJSON<{ question: string; answer: string }>(page.faq);

  const subtotal = products.reduce((sum, p) => sum + p.price * (quantities[p.id] || 1), 0);
  const activeZone = shippingZones.find((z) => z.id === selectedZone);
  const shipping = page.custom_shipping ? (page.shipping_cost ?? 60) : (activeZone?.rate ?? page.shipping_cost ?? 60);
  const total = subtotal + shipping;

  const updateQty = (id: number, qty: number, stock: number) => {
    const maxQty = Math.max(stock, 99); // Allow up to 99 or stock, whichever is higher
    setQuantities((prev) => ({ ...prev, [id]: Math.min(Math.max(1, qty), maxQty) }));
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const items = products.map((p) => ({
        product_id: p.id, product_name: p.name,
        quantity: quantities[p.id] || 1, price: p.price,
      }));
      const res = await api.createOrder({
        customer_name: form.name, customer_phone: form.phone,
        customer_email: form.email || undefined,
        customer_address: form.address, city: form.city || "N/A",
        subtotal, shipping_cost: shipping, total,
        payment_method: "cod", items,
        notes: `Landing page: ${page.slug}`,
      });
      const token = res.order_token;
      if (token) {
        router.push(`/order/${token}`);
      } else {
        const orderId = res.id || res.data?.id;
        router.push(`/lp/${page.slug}/thank-you?order=${orderId}`);
      }
    } catch (err) {
      setError((err as { message?: string }).message || "অর্ডার করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  const toBn = (n: number) => String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

  return (
    <div className="min-h-screen bg-[#faf9f8] text-[#1a1c1c] selection:bg-[color:var(--lp)] selection:text-white" suppressHydrationWarning style={{ "--lp": color, "--lp-light": `${color}15`, "--lp-medium": `${color}30` } as React.CSSProperties}>

      {/* ── HERO ── */}
      {page.hero_headline && (
        <header className="relative pt-[20px] pb-10 md:pt-[40px] md:pb-16 overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top right, ${color}, transparent)` }} />
          <div className="max-w-4xl mx-auto px-6 md:px-8 flex flex-col items-center text-center relative z-10">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-3 md:mb-6" style={{ color }}>
              {page.hero_headline}
            </h1>
            {page.hero_subheadline && (
              <p className="text-lg md:text-2xl text-gray-500 mb-4 md:mb-6 leading-relaxed max-w-2xl">{page.hero_subheadline}</p>
            )}
            {page.hero_image && (
              <div className="relative w-full aspect-video md:aspect-[21/9] mb-4 md:mb-6 rounded-3xl overflow-hidden shadow-2xl group">
                {page.hero_image.includes("youtube.com") || page.hero_image.includes("youtu.be") ? (
                  <iframe src={page.hero_image.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
                ) : page.hero_image.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={page.hero_image} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                ) : (
                  <SafeNextImage src={page.hero_image} alt={page.hero_headline || ""} fill sizes="(max-width: 768px) 100vw, 80vw" className="object-cover group-hover:scale-105 transition-transform duration-1000" priority />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
              </div>
            )}
            <div className="mb-4 md:mb-6">
              <a href="#checkout" className="inline-block px-10 py-5 rounded-full text-white text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95" style={{ backgroundColor: color }}>
                👉 {page.hero_cta || "এখনই অর্ডার করুন"}
              </a>
            </div>
            {page.hero_trust_text && (
              <div className="flex flex-wrap justify-center gap-3 text-sm font-medium text-gray-500">
                {page.hero_trust_text.split(/[\n,]/).filter(Boolean).map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-full">
                    {t.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px] -z-10" style={{ backgroundColor: `${color}08` }} />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-green-100/10 rounded-full blur-[120px] -z-10" />
        </header>
      )}

      {/* ── PROBLEM ── */}
      {(page.problem_title || problemPoints.length > 0) && (
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            {page.problem_title && (
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4" style={{ color }}>{page.problem_title}</h2>
                <div className="h-1.5 w-20 mx-auto rounded-full" style={{ backgroundColor: `${color}40` }} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {problemPoints.map((point: { text: string; icon: string }, i: number) => (
                <div key={i} className="bg-white p-7 rounded-2xl shadow-sm border border-gray-100/50 hover:shadow-md transition-shadow text-center">
                  <div className="flex justify-center mb-4">
                    {point.icon ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden">
                        <SafeImg src={point.icon} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${color}15`, color }}>!</div>
                    )}
                  </div>
                  <p className="text-gray-600 leading-relaxed">{point.text}</p>
                </div>
              ))}
            </div>
            {page.problem_title && (
              <div className="text-white p-8 rounded-3xl text-center shadow-lg max-w-2xl mx-auto" style={{ backgroundColor: color }}>
                <h3 className="text-xl md:text-2xl font-bold mb-2">সমাধান আছে!</h3>
                <p className="opacity-90 text-sm mb-5">আমাদের প্রোডাক্ট আপনার এই সমস্যাগুলো সমাধান করবে।</p>
                <a href="#checkout" className="inline-block px-8 py-3 bg-white font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95" style={{ color }}>
                  {page.hero_cta || "👉 এখনই অর্ডার করুন"}
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── PRODUCTS ── */}
      {products.length > 0 && (
        <section className="py-12 md:py-16" id="products">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-2">{page.products_title || "আমাদের প্রোডাক্ট"}</h2>
              <p className="text-lg text-gray-500 italic">{page.products_subtitle || page.products_sub || "১০০% খাঁটি ও প্রিমিয়াম মানের"}</p>
            </div>
            <div className={`mx-auto grid grid-cols-1 gap-8 ${products.length === 1 ? "max-w-sm" : products.length === 2 ? "max-w-2xl md:grid-cols-2" : "max-w-5xl md:grid-cols-2 lg:grid-cols-3"} justify-items-center`}>
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden group shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
                  <a href="#checkout" className="block">
                    <div className="relative overflow-hidden aspect-[4/3] bg-gray-50">
                      <SafeNextImage src={p.image} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      {p.original_price && p.original_price > p.price && (
                        <span className="absolute top-3 left-3 text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-md" style={{ backgroundColor: "#e53e3e" }}>
                          -{Math.round(((p.original_price - p.price) / p.original_price) * 100)}%
                        </span>
                      )}
                      <div className="absolute inset-0 group-hover:bg-black/5 transition-colors duration-300" />
                    </div>
                  </a>
                  <div className="p-4">
                    <a href="#checkout">
                      <h3 className="font-extrabold text-gray-800 text-xl md:text-2xl leading-tight line-clamp-2 group-hover:text-[var(--lp)] transition-colors">
                        {p.name}
                      </h3>
                    </a>
                    {p.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{p.description.split("\n")[0]}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xl" style={{ color }}>৳{toBn(p.price)}</span>
                      {p.original_price && p.original_price > p.price && (
                        <span className="text-gray-400 line-through text-sm">৳{toBn(p.original_price)}</span>
                      )}
                    </div>
                    <a href="#checkout"
                      className="mt-3 w-full py-2.5 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center shadow-sm hover:opacity-90"
                      style={{ backgroundColor: color }}>
                      অর্ডার করুন
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES/BENEFITS ── */}
      {features.length > 0 && (
        <section className="py-12 md:py-16 text-white" id="benefits" style={{ backgroundColor: color }}>
          <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-10 text-center lg:text-left">{page.features_title || "🔥 কেন এই প্রোডাক্ট ব্যবহার করবেন?"}</h2>
              <div className="space-y-6">
                {features.map((f, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-xl">
                      {f.icon || <FiCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-1">{f.title}</h4>
                      <p className="text-white/80 text-sm leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {page.hero_image && (
              <div className="relative order-1 lg:order-2">
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-[2rem] border border-white/20">
                  <SafeNextImage src={page.hero_image} alt="Feature" width={600} height={600} sizes="(max-width: 768px) 100vw, 50vw" className="rounded-[1.8rem] w-full h-auto" />
                </div>
                {page.hero_badge && (
                  <div className="absolute -top-3 -right-3 bg-green-100 text-green-800 px-3 py-2 rounded-xl shadow-lg text-center">
                    {page.hero_badge.split(/\\n|\n/).map((line: string, i: number) => (
                      <span key={i} className={i === 0 ? "text-lg font-black block leading-tight" : "text-[10px] uppercase tracking-wider font-bold"}>
                        {line}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      {howItWorks.length > 0 && (
        <section className="py-12 md:py-16" id="how-it-works">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3">{page.how_it_works_title || "কিভাবে ব্যবহার করবেন?"}</h2>
              <p className="text-gray-500 text-lg">{page.how_it_works_subtitle || page.how_it_works_sub || `অত্যন্ত সহজ ${toBn(howItWorks.length)}টি ধাপ`}</p>
            </div>
            <div className={`grid grid-cols-1 gap-4 relative ${howItWorks.length === 1 ? "md:grid-cols-1" : howItWorks.length === 2 ? "md:grid-cols-2" : howItWorks.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-gray-200" />
              {howItWorks.map((step, i) => (
                <div key={i} className="text-center z-10 px-4">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg text-2xl font-bold" style={{ color }}>
                    {toBn(i + 1)}
                  </div>
                  <h4 className="font-bold text-lg mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              ))}
            </div>
            {/* CTA under How It Works */}
            <div className="text-center mt-10">
              <a href="#checkout" className="inline-block px-8 py-4 rounded-full text-white text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95" style={{ backgroundColor: color }}>
                {page.hero_cta || "👉 এখনই অর্ডার করুন"}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      {testimonials.length > 0 && (
        <section className="py-12 md:py-16 bg-gray-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8">{page.testimonials_title || "গ্রাহকদের মন্তব্য"}</h2>
            <div className={`mx-auto grid grid-cols-1 gap-6 ${testimonials.length === 1 ? "max-w-md" : testimonials.length === 2 ? "max-w-3xl md:grid-cols-2" : "md:grid-cols-3"}`}>
              {testimonials.map((t, i) => (
                <div key={i} className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border-b-4" style={{ borderColor: color }}>
                  <div className="flex mb-4 text-amber-400">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <FiStar key={j} className={`w-5 h-5 ${j < t.rating ? "fill-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-lg italic text-gray-700 mb-6 leading-relaxed">"{t.review}"</p>
                  <div className="flex items-center gap-3">
                    {t.image ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative">
                        <SafeNextImage src={t.image} alt={t.name} fill sizes="40px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: color }}>
                        {t.name[0]}
                      </div>
                    )}
                    <div className="font-bold text-gray-800">{t.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {faqItems.length > 0 && (
        <section className="py-12 md:py-16" id="faq">
          <div className="max-w-3xl mx-auto px-6 md:px-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12">{page.faq_title || "সাধারণ কিছু প্রশ্ন (FAQ)"}</h2>
            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl overflow-hidden">
                  <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left font-bold text-lg hover:bg-gray-100 transition-colors">
                    <span>{item.question}</span>
                    <FiChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed">{item.answer}</div>
                  )}
                </div>
              ))}
            </div>
            {/* CTA under FAQ */}
            <div className="text-center mt-10">
              <a href="#checkout" className="inline-block px-8 py-4 rounded-full text-white text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95" style={{ backgroundColor: color }}>
                {page.hero_cta || "👉 এখনই অর্ডার করুন"}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── CHECKOUT ── */}
      {products.length > 0 && (
        <section className="py-12 md:py-16 bg-gray-100 relative overflow-hidden" id="checkout">
          <div className="max-w-4xl mx-auto px-6 md:px-8">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-14 shadow-2xl relative z-10 border border-gray-100">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color }}>{page.checkout_title || "🛒 আপনার অর্ডার দিন এখনই"}</h2>
                <p className="text-gray-500">{page.checkout_subtitle || "নিচের ফরমটি পূরণ করে অর্ডারটি কনফার্ম করুন।"}</p>
              </div>

              <form onSubmit={handleOrder} className="space-y-6">
                {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  <div className="flex-1">
                    <label className="block font-bold text-sm mb-2 px-1">আপনার নাম *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:outline-none text-sm" style={{ "--tw-ring-color": color } as React.CSSProperties}
                      placeholder="পুরো নাম লিখুন" />
                  </div>
                  <div className="flex-1">
                    <label className="block font-bold text-sm mb-2 px-1">মোবাইল নম্বর *</label>
                    <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:outline-none text-sm" style={{ "--tw-ring-color": color } as React.CSSProperties}
                      placeholder="০১৭XXXXXXXX" />
                  </div>
                </div>
                {page.show_email && (
                  <div>
                    <label className="block font-bold text-sm mb-2 px-1">ইমেইল (ঐচ্ছিক)</label>
                    <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:outline-none text-sm" style={{ "--tw-ring-color": color } as React.CSSProperties}
                      placeholder="your@email.com" />
                  </div>
                )}
                <div>
                  <label className="block font-bold text-sm mb-2 px-1">সম্পূর্ণ ঠিকানা *</label>
                  <textarea required rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:outline-none text-sm resize-none" style={{ "--tw-ring-color": color } as React.CSSProperties}
                    placeholder="গ্রাম, থানা, জেলা উল্লেখ করুন" />
                </div>
                {(page.show_city !== false) && (
                  <div>
                    <label className="block font-bold text-sm mb-2 px-1">শহর/জেলা *</label>
                    <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:outline-none text-sm" style={{ "--tw-ring-color": color } as React.CSSProperties}
                      placeholder="আপনার জেলা" />
                  </div>
                )}

                {/* Product quantity selector */}
                <div>
                  <label className="block font-bold text-sm mb-4 px-1">পরিমাণ সিলেক্ট করুন</label>
                  <div className="space-y-3">
                    {products.map((p) => (
                      <div key={p.id} className="p-3 md:p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-colors">
                        {/* Desktop: grid layout for aligned columns */}
                        <div className="hidden md:grid md:grid-cols-[48px_1fr_130px_80px] items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0"><SafeNextImage src={p.image} alt={p.name} fill sizes="48px" className="object-cover" /></div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{p.name}</div>
                            <div className="text-xs text-gray-400">৳{toBn(p.price)} / পিস</div>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => updateQty(p.id, (quantities[p.id] || 1) - 1, p.stock)}
                              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                              <FiMinus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-10 text-center font-bold">{toBn(quantities[p.id] || 1)}</span>
                            <button type="button" onClick={() => updateQty(p.id, (quantities[p.id] || 1) + 1, p.stock)}
                              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                              <FiPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="font-bold text-lg text-right" style={{ color }}>
                            ৳{toBn(p.price * (quantities[p.id] || 1))}
                          </div>
                        </div>
                        {/* Mobile: stacked layout */}
                        <div className="md:hidden">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden relative shrink-0"><SafeNextImage src={p.image} alt={p.name} fill sizes="40px" className="object-cover" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate">{p.name}</div>
                              <div className="text-xs text-gray-400">৳{toBn(p.price)} / পিস</div>
                            </div>
                            <div className="font-bold text-base shrink-0" style={{ color }}>
                              ৳{toBn(p.price * (quantities[p.id] || 1))}
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-100">
                            <button type="button" onClick={() => updateQty(p.id, (quantities[p.id] || 1) - 1, p.stock)}
                              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                              <FiMinus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-10 text-center font-bold text-lg">{toBn(quantities[p.id] || 1)}</span>
                            <button type="button" onClick={() => updateQty(p.id, (quantities[p.id] || 1) + 1, p.stock)}
                              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                              <FiPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Zone Selector (only when custom shipping is OFF) */}
                {!page.custom_shipping && shippingZones.length > 0 && (
                  <div>
                    <label className="block font-bold text-sm mb-3 px-1">ডেলিভারি এরিয়া সিলেক্ট করুন *</label>
                    <div className="space-y-2">
                      {shippingZones.map((zone) => (
                        <label key={zone.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedZone === zone.id
                              ? "border-[var(--lp)] bg-[var(--lp-light)]"
                              : "border-gray-100 hover:border-gray-200"
                          }`}>
                          <div className="flex items-center gap-3">
                            <input type="radio" name="shipping_zone" checked={selectedZone === zone.id}
                              onChange={() => setSelectedZone(zone.id)}
                              className="w-4 h-4" style={{ accentColor: color }} />
                            <div>
                              <div className="font-semibold text-sm">{zone.name}</div>
                              {zone.estimated_days && <div className="text-xs text-gray-400">{zone.estimated_days}</div>}
                            </div>
                          </div>
                          <span className="font-bold text-sm" style={{ color }}>৳{toBn(zone.rate)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500"><span>সাবটোটাল</span><span>৳{toBn(subtotal)}</span></div>
                  <div className="flex justify-between text-gray-500">
                    <span>শিপিং {activeZone ? `(${activeZone.name})` : ""}</span>
                    <span>৳{toBn(shipping)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-200" style={{ color }}>
                    <span>মোট</span><span>৳{toBn(total)}</span>
                  </div>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full text-white font-black text-xl md:text-2xl py-5 md:py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: color }}>
                  {submitting ? "অর্ডার হচ্ছে..." : page.checkout_btn_text || "অর্ডার কনফার্ম করুন"}
                </button>

                {page.guarantee_text && (
                  <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                    🛡️ {page.guarantee_text}
                  </p>
                )}
              </form>
            </div>
          </div>
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px]" style={{ backgroundColor: `${color}10` }} />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-green-100/20 rounded-full blur-[100px]" />
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-6 md:px-8 text-center">
          <div className="text-lg font-bold mb-3" style={{ color }}>{page.title}</div>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-4">
            <a href="tel:+8801731492117" className="flex items-center gap-1 hover:text-gray-700"><FiPhone className="w-3.5 h-3.5" /> +8801731492117</a>
          </div>
          <p className="text-xs text-gray-400">সারা বাংলাদেশে হোম ডেলিভারি • ক্যাশ অন ডেলিভারি</p>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      {page.whatsapp && (
        <a
          href={`https://wa.me/${page.whatsapp.replace(/[^0-9]/g, "").replace(/^0/, "880")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all"
          aria-label="WhatsApp"
        >
          <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white">
            <path d="M16.004 2.003c-7.72 0-13.995 6.275-13.995 13.995 0 2.467.655 4.872 1.898 6.988L2 30l7.213-1.89A13.94 13.94 0 0016.004 30c7.72 0 13.995-6.275 13.995-13.995S23.725 2.003 16.004 2.003zm0 25.59a11.56 11.56 0 01-5.9-1.618l-.424-.252-4.384 1.149 1.17-4.276-.277-.44a11.55 11.55 0 01-1.776-6.158c0-6.395 5.204-11.599 11.599-11.599 6.395 0 11.599 5.204 11.599 11.599-.008 6.395-5.212 11.599-11.607 11.599v-.004zm6.363-8.684c-.35-.174-2.065-1.018-2.385-1.135-.32-.117-.553-.174-.785.174-.233.349-.902 1.135-1.106 1.369-.203.233-.407.262-.757.087-.349-.174-1.474-.543-2.808-1.732-1.038-.924-1.739-2.065-1.943-2.415-.204-.349-.022-.538.153-.712.157-.157.349-.407.524-.611.175-.204.233-.349.349-.582.117-.233.058-.437-.029-.611-.087-.174-.785-1.893-1.076-2.591-.283-.68-.571-.588-.785-.599-.204-.01-.437-.012-.67-.012-.233 0-.611.087-.932.437-.32.349-1.223 1.194-1.223 2.913s1.252 3.378 1.426 3.611c.175.233 2.463 3.76 5.967 5.273.834.36 1.484.575 1.992.736.837.266 1.599.229 2.201.139.671-.1 2.065-.844 2.356-1.66.291-.815.291-1.514.204-1.66-.087-.146-.32-.233-.67-.407z"/>
          </svg>
        </a>
      )}
    </div>
  );
}

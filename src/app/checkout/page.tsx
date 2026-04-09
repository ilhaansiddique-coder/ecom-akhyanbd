"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiShoppingBag, FiCheck, FiPrinter, FiDownload } from "react-icons/fi";
import { useCart, CartItem } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
// Lazy-loaded: html2canvas-pro (~15KB) + jspdf (~60KB) only when user clicks download
const loadPdfLibs = () => Promise.all([
  import("html2canvas-pro").then(m => m.default),
  import("jspdf").then(m => m.jsPDF),
]);

const DEFAULT_SHIPPING = 60;

interface OrderData {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address: string;
  city: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  items: { id: number; product_name: string; price: number; quantity: number }[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Shipping
  const [shippingCost, setShippingCost] = useState(DEFAULT_SHIPPING);
  const [shippingLoading, setShippingLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (items.length === 0 && !order) {
      router.push("/shop");
    }
  }, [items, order, router]);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<{ id: number; label?: string; address: string; city: string; zip_code?: string }[]>([]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("auth_token");
      if (token) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"}/addresses`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        })
          .then((r) => r.ok ? r.json() : [])
          .then((data) => setSavedAddresses(Array.isArray(data) ? data : data.data || []))
          .catch(() => {});
      }
    }
  }, [user]);

  const applySavedAddress = (addr: typeof savedAddresses[0]) => {
    setAddress(addr.address);
    handleCityChange(addr.city);
    if (addr.zip_code) setZipCode(addr.zip_code);
  };

  const total = totalPrice - couponDiscount + shippingCost;

  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";
      const res = await fetch(`${API}/coupons/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal: totalPrice }),
      }).then(r => r.json());
      if (res.discount) {
        setCouponDiscount(Number(res.discount));
        setCouponMsg(`কুপন প্রয়োগ হয়েছে! ৳${res.discount} ছাড়`);
      } else {
        setCouponMsg(res.message || "কুপন কোড সঠিক নয়।");
        setCouponDiscount(0);
      }
    } catch {
      setCouponMsg("কুপন প্রয়োগ করতে সমস্যা হয়েছে।");
    } finally {
      setCouponLoading(false);
    }
  };

  // Calculate shipping based on city
  const handleCityChange = async (newCity: string) => {
    setCity(newCity);
    if (!newCity.trim()) { setShippingCost(DEFAULT_SHIPPING); return; }
    setShippingLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1"}/shipping/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ city: newCity, subtotal: totalPrice }),
      });
      const data = await res.json();
      if (data.shipping_cost != null) setShippingCost(Number(data.shipping_cost));
    } catch {
      setShippingCost(DEFAULT_SHIPPING);
    } finally {
      setShippingLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      setSavedItems([...items]);
      const res = await api.createOrder({
        customer_name: name,
        customer_phone: phone,
        customer_email: email || undefined,
        customer_address: address,
        city,
        zip_code: zipCode || undefined,
        subtotal: totalPrice,
        shipping_cost: shippingCost,
        coupon_code: couponCode || undefined,
        discount: couponDiscount || undefined,
        total,
        payment_method: paymentMethod,
        notes: notes || undefined,
        items: items.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      setOrder(res);
      clearCart();
    } catch (err: unknown) {
      const error = err as { message?: string; errors?: Record<string, string[]> };
      if (error.errors) {
        setError(Object.values(error.errors).flat().join(", "));
      } else {
        setError(error.message || "অর্ডার দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const fontBase = window.location.origin;
    printWindow.document.write(`
      <html><head><title>ইনভয়েস #${order?.id}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @font-face {
          font-family: "LiAbuJMAkkas";
          src: url("${fontBase}/fonts/LiAbuJMAkkas.ttf") format("truetype");
          font-weight: normal;
          font-style: normal;
          unicode-range: U+09E6-09EF, U+09F3;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'LiAbuJMAkkas', 'Hind Siliguri', sans-serif; color: #333; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice { max-width: 700px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0f5931; }
        .brand h1 { color: #0f5931; font-size: 22px; }
        .brand p { color: #888; font-size: 12px; }
        .invoice-meta { text-align: right; font-size: 13px; }
        .invoice-meta h2 { color: #0f5931; font-size: 18px; margin-bottom: 5px; }
        .section { margin: 20px 0; }
        .section h3 { font-size: 14px; color: #0f5931; margin-bottom: 8px; font-weight: 600; }
        .section p { font-size: 13px; line-height: 1.6; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #0f5931; color: white; padding: 10px 12px; text-align: left; font-size: 13px; }
        th:first-child { border-radius: 8px 0 0 0; }
        th:last-child { border-radius: 0 8px 0 0; text-align: right; }
        th:nth-child(2), th:nth-child(3) { text-align: center; }
        td { padding: 10px 12px; border-bottom: 1px solid #e8e8e8; font-size: 13px; }
        td:nth-child(2), td:nth-child(3) { text-align: center; }
        td:last-child { text-align: right; font-weight: 600; }
        tr:nth-child(even) { background: #f7f7f7; }
        .totals-wrap { display: flex; justify-content: flex-end; }
        .totals { width: 260px; }
        .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .totals .row span:first-child { color: #888; }
        .totals .total-row { font-size: 18px; font-weight: 700; color: #0f5931; border-top: 2px solid #0f5931; padding-top: 10px; margin-top: 5px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; text-align: center; font-size: 12px; color: #888; }
        .badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="invoice">
        <div class="header">
          <div class="brand">
            <h1>মা ভেষজ বাণিজ্যালয়</h1>
            <p>প্রাকৃতিক ভেষজ পণ্যের দোকান</p>
            <p>ইব্রাহিমপুর, লক্ষ্মীপুর, সদর, নাটোর-৬৪০০</p>
            <p>info@mavesoj.com</p>
          </div>
          <div class="invoice-meta">
            <h2>ইনভয়েস</h2>
            <p>#${toBn(order!.id)}</p>
            <p>${new Date(order!.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
            <div style="margin-top:8px"><span class="badge">${order!.status === "pending" ? "অপেক্ষমাণ" : order!.status}</span></div>
          </div>
        </div>

        <div class="info-grid">
          <div class="section">
            <h3>গ্রাহকের তথ্য</h3>
            <p>
              <strong>${order!.customer_name}</strong><br>
              ${order!.customer_phone}<br>
              ${order!.customer_email ? order!.customer_email + "<br>" : ""}
              ${order!.customer_address}<br>
              ${order!.city}
            </p>
          </div>
          <div class="section">
            <h3>পেমেন্ট তথ্য</h3>
            <p>
              মেথড: ${paymentLabels[order!.payment_method] || order!.payment_method}<br>
              স্ট্যাটাস: পেমেন্ট বাকি
            </p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>পণ্য</th>
              <th>পরিমাণ</th>
              <th>দাম</th>
              <th>মোট</th>
            </tr>
          </thead>
          <tbody>
            ${(order!.items?.length > 0 ? order!.items : savedItems.map((i, idx) => ({ id: idx, product_name: i.name, price: i.price, quantity: i.quantity })))
              .map((item, idx) => `
                <tr${idx % 2 === 1 ? ' style="background:#f7f7f7"' : ""}>
                  <td>${item.product_name}</td>
                  <td>${toBn(item.quantity)}</td>
                  <td>৳${toBn(item.price)}</td>
                  <td>৳${toBn(item.price * item.quantity)}</td>
                </tr>
              `).join("")}
          </tbody>
        </table>

        <div class="totals-wrap">
          <div class="totals">
            <div class="row"><span>সাবটোটাল</span><span>৳${toBn(order!.subtotal)}</span></div>
            <div class="row"><span>শিপিং চার্জ</span><span>৳${toBn(order!.shipping_cost)}</span></div>
            <div class="row total-row"><span>সর্বমোট</span><span>৳${toBn(order!.total)}</span></div>
          </div>
        </div>

        <div class="footer">
          <p>ধন্যবাদ আপনার অর্ডারের জন্য! — মা ভেষজ বাণিজ্যালয়</p>
          <p style="margin-top:4px">info@mavesoj.com | +880 1731492117</p>
        </div>
      </div>
      <script>
        document.fonts.ready.then(function() { window.print(); });
      </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    const el = invoiceRef.current;
    if (!el) return;
    const [html2canvas, JsPDF] = await loadPdfLibs();
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new JsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice-${order?.id || "order"}.pdf`);
  };

  const paymentLabels: Record<string, string> = {
    cod: "ক্যাশ অন ডেলিভারি",
    bkash: "বিকাশ",
    nagad: "নগদ",
    bank: "ব্যাংক ট্রান্সফার",
  };

  // === INVOICE VIEW ===
  if (order) {
    const invoiceItems = order.items?.length > 0 ? order.items : savedItems.map((i, idx) => ({
      id: idx,
      product_name: i.name,
      price: i.price,
      quantity: i.quantity,
    }));

    return (
      <section className="py-8 md:py-12 bg-background-alt min-h-[70vh]">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Success Banner */}
            <div className="bg-primary/10 rounded-2xl p-6 mb-8 flex items-center gap-4">
              <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shrink-0">
                <FiCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">অর্ডার সফল হয়েছে!</h1>
                <p className="text-text-muted text-sm mt-1">আপনার অর্ডার গ্রহণ করা হয়েছে। শীঘ্রই আমরা যোগাযোগ করব।</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button onClick={handlePrint} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-colors shadow-sm">
                <FiPrinter className="w-4 h-4" />
                প্রিন্ট করুন
              </button>
              <button onClick={handleDownload} className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary hover:text-white transition-colors">
                <FiDownload className="w-4 h-4" />
                ডাউনলোড PDF
              </button>
              <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-foreground rounded-xl font-medium hover:bg-background-alt transition-colors">
                অর্ডার ট্র্যাক করুন
              </button>
              <button onClick={() => router.push("/shop")} className="inline-flex items-center gap-2 px-5 py-2.5 border border-border text-foreground rounded-xl font-medium hover:bg-background-alt transition-colors">
                আরও শপিং করুন
              </button>
            </div>

            {/* Invoice Card */}
            <div ref={invoiceRef} className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="invoice">
                {/* Invoice Header */}
                <div className="header flex items-start justify-between p-6 md:p-8 border-b-2 border-primary">
                  <div className="brand">
                    <h1 className="text-xl md:text-2xl font-bold text-primary">মা ভেষজ বাণিজ্যালয়</h1>
                    <p className="text-text-muted text-xs mt-1">প্রাকৃতিক ভেষজ পণ্যের দোকান</p>
                    <p className="text-text-muted text-xs">ইব্রাহিমপুর, লক্ষ্মীপুর, সদর, নাটোর-৬৪০০</p>
                    <p className="text-text-muted text-xs">info@mavesoj.com</p>
                  </div>
                  <div className="invoice-meta text-right">
                    <h2 className="text-lg font-bold text-primary">ইনভয়েস</h2>
                    <p className="text-sm text-text-body mt-1">#{toBn(order.id)}</p>
                    <p className="text-xs text-text-muted mt-1">{new Date(order.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
                    <span className="inline-block mt-2 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                      {order.status === "pending" ? "অপেক্ষমাণ" : order.status}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="p-6 md:px-8 grid md:grid-cols-2 gap-6">
                  <div className="section">
                    <h3 className="text-sm font-bold text-primary mb-2">গ্রাহকের তথ্য</h3>
                    <p className="text-sm text-text-body leading-relaxed">
                      <strong>{order.customer_name}</strong><br />
                      {order.customer_phone}<br />
                      {order.customer_email && <>{order.customer_email}<br /></>}
                      {order.customer_address}<br />
                      {order.city}
                    </p>
                  </div>
                  <div className="section">
                    <h3 className="text-sm font-bold text-primary mb-2">পেমেন্ট তথ্য</h3>
                    <p className="text-sm text-text-body leading-relaxed">
                      মেথড: {paymentLabels[order.payment_method] || order.payment_method}<br />
                      স্ট্যাটাস: পেমেন্ট বাকি
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="px-6 md:px-8">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-primary text-white">
                        <th className="py-3 px-4 text-left text-sm font-semibold rounded-tl-xl">পণ্য</th>
                        <th className="py-3 px-4 text-center text-sm font-semibold">পরিমাণ</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold">দাম</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold rounded-tr-xl">মোট</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => (
                        <tr key={item.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-background-alt"}>
                          <td className="py-3 px-4 text-sm text-foreground">{item.product_name}</td>
                          <td className="py-3 px-4 text-sm text-center">{toBn(item.quantity)}</td>
                          <td className="py-3 px-4 text-sm text-right">৳{toBn(item.price)}</td>
                          <td className="py-3 px-4 text-sm text-right font-semibold">৳{toBn(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="p-6 md:px-8 flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-text-muted">সাবটোটাল</span>
                      <span className="font-medium">৳{toBn(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-text-muted">শিপিং চার্জ</span>
                      <span className="font-medium">৳{toBn(order.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-primary mt-2">
                      <span>সর্বমোট</span>
                      <span className="text-primary">৳{toBn(order.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 md:px-8 pb-6 pt-4 border-t border-border text-center">
                  <p className="text-xs text-text-muted">ধন্যবাদ আপনার অর্ডারের জন্য! — মা ভেষজ বাণিজ্যালয়</p>
                  <p className="text-xs text-text-light mt-1">info@mavesoj.com | +880 1731492117</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // === CHECKOUT FORM ===
  return (
    <section className="py-8 md:py-12 bg-background-alt min-h-[70vh]">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">চেকআউট</h1>

          {error && (
            <div className="p-4 mb-6 bg-sale-red/10 text-sale-red text-sm rounded-xl">{error}</div>
          )}

          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            {/* Form */}
            <form onSubmit={handleSubmit} id="checkout-form" className="bg-white rounded-2xl border border-border p-6 md:p-8 space-y-5">
              <h2 className="text-lg font-bold text-foreground mb-2">ডেলিভারি তথ্য</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">নাম *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">ফোন নম্বর *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">ইমেইল</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
              </div>

              {savedAddresses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">সংরক্ষিত ঠিকানা</label>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => applySavedAddress(addr)}
                        className="px-3 py-2 text-xs border border-border rounded-lg hover:border-primary hover:text-primary transition-colors text-left"
                      >
                        <span className="font-medium">{addr.label || addr.city}</span>
                        <span className="text-text-muted block truncate max-w-48">{addr.address}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">ঠিকানা *</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">শহর *</label>
                  <input type="text" value={city} onChange={(e) => handleCityChange(e.target.value)} required className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">জিপ কোড</label>
                  <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">পেমেন্ট মেথড *</label>
                <div className="space-y-2">
                  {[
                    { value: "cod", label: "ক্যাশ অন ডেলিভারি" },
                    { value: "bkash", label: "বিকাশ" },
                    { value: "nagad", label: "নগদ" },
                  ].map((m) => (
                    <label key={m.value} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${paymentMethod === m.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                      <input type="radio" name="payment" value={m.value} checked={paymentMethod === m.value} onChange={(e) => setPaymentMethod(e.target.value)} className="accent-primary" />
                      <span className="text-sm font-medium">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">নোট (ঐচ্ছিক)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:border-primary focus:outline-none resize-none" placeholder="ডেলিভারি সম্পর্কে কোনো নির্দেশনা..." />
              </div>
            </form>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-border p-6 h-fit sticky top-24">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <FiShoppingBag className="w-5 h-5 text-primary" />
                অর্ডার সারাংশ
              </h2>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-background-alt shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-text-muted">{toBn(item.quantity)}টি × ৳{toBn(item.price)}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">৳{toBn(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium text-foreground mb-1.5">কুপন কোড</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="কুপন কোড লিখুন"
                    className="flex-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50"
                  >
                    {couponLoading ? "..." : "প্রয়োগ"}
                  </button>
                </div>
                {couponMsg && (
                  <p className={`text-xs mt-1.5 ${couponDiscount > 0 ? "text-green-600" : "text-sale-red"}`}>{couponMsg}</p>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">সাবটোটাল</span>
                  <span className="font-medium">৳{toBn(totalPrice)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">কুপন ছাড়</span>
                    <span className="font-medium text-green-600">-৳{toBn(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">শিপিং চার্জ {shippingLoading && <span className="text-xs">(গণনা হচ্ছে...)</span>}</span>
                  <span className="font-medium">৳{toBn(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>সর্বমোট</span>
                  <span className="text-primary">৳{toBn(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={loading}
                className="mt-6 w-full py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-light transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "অর্ডার হচ্ছে..." : "অর্ডার দিন"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

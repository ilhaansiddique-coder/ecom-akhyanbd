"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiShoppingBag, FiCheck, FiPrinter, FiDownload, FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { useCart, CartItem } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import { SafeNextImage } from "@/components/SafeImage";
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
  const { items, hydrated, totalPrice, clearCart, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Shipping zones
  const [shippingCost, setShippingCost] = useState(DEFAULT_SHIPPING);
  const [shippingZones, setShippingZones] = useState<{ id: number; name: string; rate: number; cities: string[]; estimated_days?: string }[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  // Checkout settings (customizer)
  const [checkoutSettings, setCheckoutSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  // Fetch shipping zones + checkout settings on mount
  useEffect(() => {
    fetch("/api/v1/shipping/zones", { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(data => {
        const zones = (Array.isArray(data) ? data : data.data || []).map((z: any) => ({
          ...z,
          cities: typeof z.cities === "string" ? JSON.parse(z.cities) : (z.cities || []),
        }));
        setShippingZones(zones);
        if (zones.length > 0) {
          setSelectedZone(zones[0].id);
          setShippingCost(zones[0].rate);
        }
      })
      .catch(() => {});
    fetch("/api/v1/checkout-settings", { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(data => setCheckoutSettings(data || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Wait for cart to load from localStorage before deciding to redirect
    if (hydrated && items.length === 0 && !order && !orderPlaced) {
      router.push("/shop");
    }
  }, [hydrated, items, order, orderPlaced, router]);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<{ id: number; label?: string; address: string; city: string; zip_code?: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetch(`/api/v1/addresses`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setSavedAddresses(Array.isArray(data) ? data : data.data || []))
        .catch(() => {});
    }
  }, [user]);

  const applySavedAddress = (addr: typeof savedAddresses[0]) => {
    setAddress(addr.address);
    setCity(addr.city);
    if (addr.zip_code) setZipCode(addr.zip_code);
  };

  const total = totalPrice - couponDiscount + shippingCost;

  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg("");
    try {
      const res = await fetch(`/api/v1/coupons/apply`, {
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

  const handleZoneSelect = (zoneId: number) => {
    setSelectedZone(zoneId);
    const zone = shippingZones.find(z => z.id === zoneId);
    if (zone) setShippingCost(zone.rate);
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
        city: city || (selectedZone ? shippingZones.find(z => z.id === selectedZone)?.name || "" : ""),
        zip_code: zipCode || undefined,
        subtotal: totalPrice,
        shipping_cost: shippingCost,
        coupon_code: couponCode || undefined,
        discount: couponDiscount || undefined,
        total,
        payment_method: paymentMethod,
        transaction_id: transactionId || undefined,
        notes: notes || undefined,
        items: items.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      setOrderPlaced(true);
      clearCart();
      // Redirect to unique order page if token available
      if (res.order_token) {
        router.push(`/order/${res.order_token}`);
        return;
      }
      setOrder(res);
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
    printWindow.document.write(`
      <html><head><title>ইনভয়েস #${order?.id}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Hind Siliguri', sans-serif; color: #333; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
  const inputCls = "w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-primary focus:outline-none text-sm";

  return (
    <section className="py-8 md:py-16 bg-gray-100 min-h-[70vh]">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-4xl font-extrabold text-primary mb-2">{checkoutSettings.checkout_title || "🛒 আপনার অর্ডার দিন"}</h1>
              <p className="text-gray-500 text-sm md:text-base">{checkoutSettings.checkout_subtitle || "নিচের ফরমটি পূরণ করে অর্ডারটি কনফার্ম করুন।"}</p>
            </div>

            {error && (
              <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Products with qty controls */}
              <div>
                <label className="block font-bold text-sm mb-3 px-1">আপনার পণ্য</label>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="p-3 md:p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden shrink-0 relative">
                          <SafeNextImage src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate mb-2">{item.name}</div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => {
                              if (item.quantity <= 1) removeItem(item.id);
                              else updateQuantity(item.id, item.quantity - 1);
                            }}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 shrink-0">
                              <FiMinus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-bold text-sm">{toBn(item.quantity)}</span>
                            <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 shrink-0">
                              <FiPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="font-bold text-lg text-primary">৳{toBn(item.price * item.quantity)}</div>
                          <button type="button" onClick={() => removeItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Name + Phone */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block font-bold text-sm mb-2 px-1">আপনার নাম *</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="পুরো নাম লিখুন" />
                </div>
                <div className="flex-1">
                  <label className="block font-bold text-sm mb-2 px-1">মোবাইল নম্বর *</label>
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="০১৭XXXXXXXX" />
                </div>
              </div>

              {/* Email — conditional */}
              {checkoutSettings.checkout_show_email === "true" && (
                <div>
                  <label className="block font-bold text-sm mb-2 px-1">ইমেইল (ঐচ্ছিক)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="your@email.com" />
                </div>
              )}

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div>
                  <label className="block font-bold text-sm mb-2 px-1">সংরক্ষিত ঠিকানা</label>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((addr) => (
                      <button key={addr.id} type="button" onClick={() => applySavedAddress(addr)}
                        className="px-3 py-2 text-xs border-2 border-gray-100 rounded-xl hover:border-primary hover:text-primary transition-colors text-left">
                        <span className="font-medium">{addr.label || addr.city}</span>
                        <span className="text-gray-400 block truncate max-w-48">{addr.address}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Address */}
              <div>
                <label className="block font-bold text-sm mb-2 px-1">সম্পূর্ণ ঠিকানা *</label>
                <textarea required rows={3} value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls + " resize-none"} placeholder="গ্রাম, থানা, জেলা উল্লেখ করুন" />
              </div>

              {/* Shipping Zone Selector */}
              {shippingZones.length > 0 && (
                <div>
                  <label className="block font-bold text-sm mb-3 px-1">ডেলিভারি এরিয়া সিলেক্ট করুন *</label>
                  <div className="space-y-2">
                    {shippingZones.map((zone) => (
                      <label key={zone.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedZone === zone.id
                            ? "border-primary bg-primary/5"
                            : "border-gray-100 hover:border-gray-200"
                        }`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="shipping_zone" checked={selectedZone === zone.id}
                            onChange={() => handleZoneSelect(zone.id)} className="accent-primary w-4 h-4" />
                          <div>
                            <span className="text-sm font-semibold">{zone.name}</span>
                            {zone.estimated_days && (
                              <span className="text-xs text-gray-400 ml-2">({zone.estimated_days})</span>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                              {Array.isArray(zone.cities) ? zone.cities.join(", ") : zone.cities}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">৳{toBn(zone.rate)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* City fallback if no zones + Zip */}
              {shippingZones.length === 0 && (
                <div>
                  <label className="block font-bold text-sm mb-2 px-1">শহর/জেলা *</label>
                  <input required value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="আপনার জেলা" />
                </div>
              )}

              {checkoutSettings.checkout_show_zip === "true" && (
                <div>
                  <label className="block font-bold text-sm mb-2 px-1">জিপ কোড</label>
                  <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className={inputCls} placeholder="৬৪০০" />
                </div>
              )}

              {/* Coupon — conditional */}
              {checkoutSettings.checkout_show_coupon !== "false" && (
              <div>
                <label className="block font-bold text-sm mb-2 px-1">কুপন কোড</label>
                <div className="flex gap-2">
                  <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className={inputCls + " flex-1"} placeholder="কুপন কোড লিখুন" />
                  <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                    className="px-5 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50 shrink-0">
                    {couponLoading ? "..." : "প্রয়োগ"}
                  </button>
                </div>
                {couponMsg && <p className={`text-xs mt-1.5 px-1 ${couponDiscount > 0 ? "text-green-600" : "text-red-500"}`}>{couponMsg}</p>}
              </div>
              )}

              {/* Payment Methods — dynamic from settings */}
              {(() => {
                const methods = [
                  { value: "cod", label: "ক্যাশ অন ডেলিভারি", icon: "💵", enabled: checkoutSettings.checkout_payment_cod !== "false" },
                  { value: "bkash", label: "বিকাশ", icon: "📱", enabled: checkoutSettings.checkout_payment_bkash === "true" },
                  { value: "nagad", label: "নগদ", icon: "📲", enabled: checkoutSettings.checkout_payment_nagad === "true" },
                ].filter(m => m.enabled);
                if (methods.length === 0) return null;
                return (
                  <div>
                    <label className="block font-bold text-sm mb-3 px-1">পেমেন্ট মেথড *</label>
                    <div className="space-y-2">
                      {methods.map((m) => (
                        <div key={m.value}>
                          <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === m.value ? "border-primary bg-primary/5" : "border-gray-100 hover:border-gray-200"}`}>
                            <input type="radio" name="payment" value={m.value} checked={paymentMethod === m.value} onChange={(e) => setPaymentMethod(e.target.value)} className="accent-primary w-4 h-4" />
                            <span className="text-lg">{m.icon}</span>
                            <span className="text-sm font-semibold">{m.label}</span>
                            {m.value === "bkash" && checkoutSettings.checkout_bkash_number && (
                              <span className="text-xs text-gray-400 ml-auto">{checkoutSettings.checkout_bkash_number}</span>
                            )}
                            {m.value === "nagad" && checkoutSettings.checkout_nagad_number && (
                              <span className="text-xs text-gray-400 ml-auto">{checkoutSettings.checkout_nagad_number}</span>
                            )}
                          </label>
                          {/* bKash instructions + TrxID */}
                          {m.value === "bkash" && paymentMethod === "bkash" && (
                            <div className="mt-2 ml-2 p-4 bg-pink-50 rounded-xl border border-pink-100 space-y-3">
                              {checkoutSettings.checkout_bkash_instruction && (
                                <div>
                                  <p className="text-xs font-bold text-pink-700 mb-1">📱 বিকাশে পেমেন্ট করার নিয়ম:</p>
                                  <p className="text-xs text-pink-600 whitespace-pre-line">{checkoutSettings.checkout_bkash_instruction}</p>
                                </div>
                              )}
                              {checkoutSettings.checkout_bkash_number && (
                                <p className="text-sm font-bold text-pink-700">বিকাশ নম্বর: {checkoutSettings.checkout_bkash_number}</p>
                              )}
                              <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
                                className="w-full bg-white border border-pink-200 rounded-xl p-3 focus:ring-2 focus:ring-pink-300 focus:outline-none text-sm placeholder-pink-300"
                                placeholder="বিকাশ Transaction ID লিখুন" required />
                            </div>
                          )}
                          {/* Nagad instructions + TrxID */}
                          {m.value === "nagad" && paymentMethod === "nagad" && (
                            <div className="mt-2 ml-2 p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                              {checkoutSettings.checkout_nagad_instruction && (
                                <div>
                                  <p className="text-xs font-bold text-orange-700 mb-1">📲 নগদে পেমেন্ট করার নিয়ম:</p>
                                  <p className="text-xs text-orange-600 whitespace-pre-line">{checkoutSettings.checkout_nagad_instruction}</p>
                                </div>
                              )}
                              {checkoutSettings.checkout_nagad_number && (
                                <p className="text-sm font-bold text-orange-700">নগদ নম্বর: {checkoutSettings.checkout_nagad_number}</p>
                              )}
                              <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
                                className="w-full bg-white border border-orange-200 rounded-xl p-3 focus:ring-2 focus:ring-orange-300 focus:outline-none text-sm placeholder-orange-300"
                                placeholder="নগদ Transaction ID লিখুন" required />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Notes — conditional */}
              {checkoutSettings.checkout_show_notes !== "false" && (
                <div>
                  <label className="block font-bold text-sm mb-2 px-1">নোট (ঐচ্ছিক)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="ডেলিভারি সম্পর্কে কোনো নির্দেশনা..." />
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">সাবটোটাল</span>
                  <span className="font-semibold">৳{toBn(totalPrice)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">কুপন ছাড়</span>
                    <span className="font-semibold text-green-600">-৳{toBn(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">শিপিং চার্জ</span>
                  <span className="font-semibold">৳{toBn(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-xl font-extrabold pt-3 border-t-2 border-primary/20">
                  <span>সর্বমোট</span>
                  <span className="text-primary">৳{toBn(total)}</span>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-4 md:py-5 rounded-full text-white text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-light">
                {loading ? "অর্ডার হচ্ছে..." : (checkoutSettings.checkout_btn_text || "✅ অর্ডার কনফার্ম করুন")}
              </button>

              {/* Trust / Guarantee */}
              {checkoutSettings.checkout_guarantee_text ? (
                <p className="text-center text-xs font-medium text-gray-400 pt-2">{checkoutSettings.checkout_guarantee_text}</p>
              ) : (
                <div className="flex flex-wrap justify-center gap-3 text-xs font-medium text-gray-400 pt-2">
                  <span>🔒 নিরাপদ অর্ডার</span>
                  <span>•</span>
                  <span>🚚 দ্রুত ডেলিভারি</span>
                  <span>•</span>
                  <span>💵 ক্যাশ অন ডেলিভারি</span>
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

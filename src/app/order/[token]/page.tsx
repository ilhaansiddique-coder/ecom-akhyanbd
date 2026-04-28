"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { FiCheck, FiPhone, FiMapPin, FiPackage } from "react-icons/fi";
import { toBn } from "@/utils/toBn";
import { useSiteSettings } from "@/lib/SiteSettingsContext";

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
  payment_status: string;
  transaction_id?: string;
  status: string;
  created_at: string;
  items: { id: number; product_name: string; price: number; quantity: number }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800" },
  processing: { label: "প্রসেসিং", color: "bg-indigo-100 text-indigo-800" },
  on_hold: { label: "অন হোল্ড", color: "bg-orange-100 text-orange-800" },
  confirmed: { label: "নিশ্চিত", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "কুরিয়ার পাঠানো হয়েছে", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "ডেলিভারি সম্পন্ন", color: "bg-green-100 text-green-800" },
  cancelled: { label: "বাতিল", color: "bg-red-100 text-red-800" },
};

const paymentLabels: Record<string, string> = {
  cod: "ক্যাশ অন ডেলিভারি",
  bkash: "বিকাশ",
  nagad: "নগদ",
  bank: "ব্যাংক ট্রান্সফার",
};

export default function OrderConfirmationPage() {
  const params = useParams();
  const token = params.token as string;
  const siteSettings = useSiteSettings();
  const siteName = siteSettings.site_name || "Site";
  const sitePhone = siteSettings.phone || "";
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/v1/orders/token/${token}`, { headers: { Accept: "application/json" } })
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(data => setOrder(data))
      .catch(() => setError("অর্ডার খুঁজে পাওয়া যায়নি।"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <section className="py-16 bg-gray-100 min-h-[70vh]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
            <div className="h-6 bg-gray-200 rounded-xl w-64 mx-auto" />
            <div className="h-4 bg-gray-200 rounded-xl w-48 mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="py-16 bg-gray-100 min-h-[70vh]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl p-10 shadow-sm">
            <div className="text-4xl mb-4">😔</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">{error || "অর্ডার খুঁজে পাওয়া যায়নি"}</h1>
            <p className="text-gray-500 text-sm">এই লিঙ্কটি সঠিক নয় অথবা অর্ডারটি মুছে ফেলা হয়েছে।</p>
          </div>
        </div>
      </section>
    );
  }

  const st = statusLabels[order.status] || { label: order.status, color: "bg-gray-100 text-gray-800" };
  const steps = ["pending", "processing", "confirmed", "shipped", "delivered"];
  const currentIdx = steps.indexOf(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "on_hold";

  return (
    <section className="py-8 md:py-16 bg-gray-100 min-h-[70vh]">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Success / Status Banner */}
          <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-xl border border-gray-100 mb-6">
            <div className="text-center mb-8">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isCancelled ? "bg-red-100" : "bg-green-100"}`}>
                <FiCheck className={`w-8 h-8 ${isCancelled ? "text-red-600" : "text-green-600"}`} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-2">
                {isCancelled ? "অর্ডার বাতিল হয়েছে" : "অর্ডার সফল হয়েছে!"}
              </h1>
              <p className="text-gray-500 text-sm">
                অর্ডার নম্বর: <span className="font-bold text-primary">#{toBn(order.id)}</span>
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {new Date(order.created_at).toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            {/* Order Tracking */}
            {!isCancelled && (
              <div className="flex items-center mb-8 px-4">
                {steps.map((step, i) => {
                  const isActive = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  const stepLabels: Record<string, string> = {
                    pending: "অপেক্ষমাণ", processing: "প্রসেসিং", confirmed: "নিশ্চিত", shipped: "কুরিয়ার পাঠানো হয়েছে", delivered: "ডেলিভারি"
                  };
                  return (
                    <div key={step} className="flex items-center" style={{ flex: i < steps.length - 1 ? 1 : "none" }}>
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? "bg-primary text-white ring-2 ring-primary/30" : isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-400"}`}>
                          {isActive ? "✓" : toBn(i + 1)}
                        </div>
                        <span className={`text-[10px] mt-1 whitespace-nowrap ${isActive ? "text-primary font-semibold" : "text-gray-400"}`}>{stepLabels[step]}</span>
                      </div>
                      {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? "bg-primary" : "bg-gray-200"}`} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Status Badge */}
            <div className="flex justify-center mb-6">
              <span className={`text-sm px-4 py-1.5 rounded-full font-semibold ${st.color}`}>{st.label}</span>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <FiPackage className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold">{order.customer_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiPhone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{order.customer_phone}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <FiMapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span>{order.customer_address}{order.city ? `, ${order.city}` : ""}</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-sm text-gray-700 px-1">অর্ডারকৃত পণ্য</h3>
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{toBn(item.quantity)}টি × ৳{toBn(item.price)}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">৳{toBn(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">সাবটোটাল</span>
                <span className="font-semibold">৳{toBn(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">শিপিং চার্জ</span>
                <span className="font-semibold">৳{toBn(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between text-lg font-extrabold pt-2 border-t-2 border-primary/20">
                <span>সর্বমোট</span>
                <span className="text-primary">৳{toBn(order.total)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                {paymentLabels[order.payment_method] || order.payment_method}
              </span>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${order.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                {order.payment_status === "paid" ? "পেমেন্ট সম্পন্ন" : "পেমেন্ট বাকি"}
              </span>
              {order.transaction_id && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
                  TrxID: {order.transaction_id}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">ধন্যবাদ আপনার অর্ডারের জন্য! শীঘ্রই আমরা যোগাযোগ করব।</p>
              <p className="text-xs text-gray-400 mt-1">{[siteName, sitePhone].filter(Boolean).join(" | ")}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

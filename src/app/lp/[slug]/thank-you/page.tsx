"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FiCheckCircle, FiPackage, FiPhone, FiMail, FiArrowLeft } from "react-icons/fi";
import { api } from "@/lib/api";
import Link from "next/link";

interface OrderData {
  id: number;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  items: { product_name: string; price: number; quantity: number }[];
  created_at: string;
}

export default function ThankYouPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    api.getOrder(Number(orderId))
      .then((res) => setOrder(res.data || res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Success card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#0f5931] text-white text-center py-8 px-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">ধন্যবাদ!</h1>
            <p className="text-white/80 mt-2">আপনার অর্ডার সফলভাবে গৃহীত হয়েছে</p>
          </div>

          {/* Order details */}
          <div className="p-6 space-y-5">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-[#0f5931] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : order ? (
              <>
                {/* Order ID */}
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500">অর্ডার নম্বর</p>
                  <p className="text-2xl font-bold text-[#0f5931] mt-1">#{order.id}</p>
                </div>

                {/* Customer */}
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium text-gray-800">গ্রাহক:</span> {order.customer_name}</p>
                  <p><span className="font-medium text-gray-800">ফোন:</span> {order.customer_phone}</p>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">পণ্যসমূহ</h3>
                  <div className="space-y-2">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FiPackage className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{item.product_name} × {item.quantity}</span>
                        </div>
                        <span className="font-semibold text-[#0f5931]">৳{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-[#0f5931]/5 rounded-xl p-4 flex justify-between items-center">
                  <span className="font-medium text-gray-700">মোট</span>
                  <span className="text-xl font-bold text-[#0f5931]">৳{order.total}</span>
                </div>

                {/* Delivery info */}
                <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-800">
                  <p className="font-medium">📦 আনুমানিক ডেলিভারি: ২-৫ কার্যদিবস</p>
                  <p className="text-xs text-yellow-600 mt-1">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব</p>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">অর্ডার তথ্য পাওয়া যায়নি</p>
              </div>
            )}

            {/* Contact */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-2">
              <a href="tel:+8801731492117" className="flex items-center gap-1 hover:text-gray-600"><FiPhone className="w-3 h-3" /> +8801731492117</a>
              <a href="mailto:info@mavesoj.com" className="flex items-center gap-1 hover:text-gray-600"><FiMail className="w-3 h-3" /> info@mavesoj.com</a>
            </div>

            {/* Back to home */}
            <div className="text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#0f5931] font-medium hover:underline">
                <FiArrowLeft className="w-4 h-4" /> হোম পেজে ফিরে যান
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

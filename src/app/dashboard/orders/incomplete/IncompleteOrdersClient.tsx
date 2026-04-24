"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LanguageContext";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import { FiPhone, FiMessageCircle, FiTrash2, FiEye, FiShoppingBag, FiRefreshCw, FiX } from "react-icons/fi";

interface CartItemRow {
  product_id?: number;
  variant_id?: number | null;
  variant_label?: string | null;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
}

interface IncompleteOrder {
  id: number;
  phone: string;
  name?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  zip_code?: string | null;
  notes?: string | null;
  cart_items: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  user_id?: number | null;
  source?: string | null;
  converted_at?: string | null;
  created_at: string;
  updated_at: string;
}

function parseCart(json: string): CartItemRow[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function ago(iso: string, lang: "en" | "bn"): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return lang === "en" ? "just now" : "এইমাত্র";
  if (m < 60) return lang === "en" ? `${m}m ago` : `${m} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "en" ? `${h}h ago` : `${h} ঘন্টা আগে`;
  const d = Math.floor(h / 24);
  return lang === "en" ? `${d}d ago` : `${d} দিন আগে`;
}

export default function IncompleteOrdersClient() {
  const { lang } = useLang();
  const settings = useSiteSettings();
  const [rows, setRows] = useState<IncompleteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<IncompleteOrder | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/incomplete-orders", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const value = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    return { total, value };
  }, [rows]);

  const onDelete = async (id: number) => {
    if (!confirm(lang === "en" ? "Delete this entry?" : "এটি মুছে ফেলবেন?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/v1/admin/incomplete-orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setRows((p) => p.filter((r) => r.id !== id));
      if (viewing?.id === id) setViewing(null);
    } finally {
      setDeletingId(null);
    }
  };

  const waMsg = (r: IncompleteOrder): string => {
    const items = parseCart(r.cart_items);
    const lines = items.map((i) => `• ${i.name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.quantity}`).join("\n");
    const siteName = settings.site_name || "";
    if (lang === "en") {
      return `Hi ${r.name || ""}, this is ${siteName}. We saw you started an order but didn't complete it. Your cart:\n${lines}\nTotal: ৳${r.total}\nWould you like us to confirm it?`;
    }
    return `আসসালামু আলাইকুম ${r.name || ""}, ${siteName} থেকে বলছি। আপনি একটি অর্ডার শুরু করেছিলেন কিন্তু সম্পূর্ণ করেননি। আপনার কার্ট:\n${lines}\nমোট: ৳${r.total}\nআমরা কি অর্ডারটি কনফার্ম করে দিব?`;
  };

  const waLink = (r: IncompleteOrder) => `https://wa.me/88${r.phone}?text=${encodeURIComponent(waMsg(r))}`;

  // Convert: send to /dashboard/orders/new (or fallback) prefilled via query
  const convertHref = (r: IncompleteOrder) => {
    const params = new URLSearchParams({
      name: r.name || "",
      phone: r.phone,
      email: r.email || "",
      address: r.address || "",
      city: r.city || "",
      zip: r.zip_code || "",
      notes: r.notes || "",
      cart: r.cart_items,
    });
    return `/dashboard/orders/new?${params.toString()}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {lang === "en" ? "Incomplete Orders" : "অসম্পূর্ণ অর্ডার"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {lang === "en"
              ? "Customers who filled the checkout but didn't submit. Auto-purges after 10 days."
              : "যেসব কাস্টমার চেকআউট ফরম পূরণ করেছে কিন্তু অর্ডার দেয়নি। ১০ দিন পর স্বয়ংক্রিয় মুছে যায়।"}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {lang === "en" ? "Refresh" : "রিফ্রেশ"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="text-xs text-gray-500">{lang === "en" ? "Pending" : "অপেক্ষমাণ"}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="text-xs text-gray-500">{lang === "en" ? "Lost cart value" : "হারানো কার্ট মূল্য"}</div>
          <div className="text-2xl font-bold text-[#0f5931] mt-1">৳{stats.value.toLocaleString()}</div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          {lang === "en" ? "Loading..." : "লোড হচ্ছে..."}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          <FiShoppingBag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          {lang === "en" ? "No incomplete orders right now." : "এই মুহূর্তে কোনো অসম্পূর্ণ অর্ডার নেই।"}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rows.map((r) => {
              const items = parseCart(r.cart_items);
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate">{r.name || (lang === "en" ? "(no name)" : "(নাম নেই)")}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.phone}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#0f5931]">৳{Number(r.total).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400">{ago(r.updated_at, lang)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    {items.length} {lang === "en" ? "item(s)" : "টি পণ্য"} · {(r.city || r.address || "—").slice(0, 60)}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => setViewing(r)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg flex items-center gap-1.5">
                      <FiEye className="w-3.5 h-3.5" /> {lang === "en" ? "View" : "দেখুন"}
                    </button>
                    <a href={`tel:${r.phone}`} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg flex items-center gap-1.5 text-blue-600">
                      <FiPhone className="w-3.5 h-3.5" /> {lang === "en" ? "Call" : "কল"}
                    </a>
                    <a href={waLink(r)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs rounded-lg bg-green-50 text-green-700 flex items-center gap-1.5">
                      <FiMessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <Link href={convertHref(r)} className="px-3 py-1.5 text-xs rounded-lg bg-[#0f5931] text-white flex items-center gap-1.5">
                      <FiShoppingBag className="w-3.5 h-3.5" /> {lang === "en" ? "Convert" : "কনভার্ট"}
                    </Link>
                    <button
                      onClick={() => onDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{lang === "en" ? "Customer" : "কাস্টমার"}</th>
                    <th className="px-4 py-3 font-semibold">{lang === "en" ? "Phone" : "ফোন"}</th>
                    <th className="px-4 py-3 font-semibold">{lang === "en" ? "Items" : "পণ্য"}</th>
                    <th className="px-4 py-3 font-semibold text-right">{lang === "en" ? "Total" : "মোট"}</th>
                    <th className="px-4 py-3 font-semibold">{lang === "en" ? "Updated" : "আপডেট"}</th>
                    <th className="px-4 py-3 font-semibold text-right">{lang === "en" ? "Actions" : "অ্যাকশন"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const items = parseCart(r.cart_items);
                    return (
                      <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/40">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{r.name || (lang === "en" ? "(no name)" : "(নাম নেই)")}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[220px]">{r.city || r.address || "—"}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{r.phone}</td>
                        <td className="px-4 py-3 text-gray-700">{items.length}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#0f5931]">৳{Number(r.total).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{ago(r.updated_at, lang)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => setViewing(r)} title={lang === "en" ? "View" : "দেখুন"} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                              <FiEye className="w-4 h-4 text-gray-600" />
                            </button>
                            <a href={`tel:${r.phone}`} title={lang === "en" ? "Call" : "কল"} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                              <FiPhone className="w-4 h-4 text-blue-600" />
                            </a>
                            <a href={waLink(r)} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-2 rounded-lg bg-green-50 hover:bg-green-100">
                              <FiMessageCircle className="w-4 h-4 text-green-700" />
                            </a>
                            <Link href={convertHref(r)} title={lang === "en" ? "Convert" : "কনভার্ট"} className="p-2 rounded-lg bg-[#0f5931] hover:bg-[#0d4d2a]">
                              <FiShoppingBag className="w-4 h-4 text-white" />
                            </Link>
                            <button
                              onClick={() => onDelete(r.id)}
                              disabled={deletingId === r.id}
                              title={lang === "en" ? "Delete" : "ডিলিট"}
                              className="p-2 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-40"
                            >
                              <FiTrash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setViewing(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{lang === "en" ? "Incomplete Order" : "অসম্পূর্ণ অর্ডার"}</h2>
              <button onClick={() => setViewing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label={lang === "en" ? "Name" : "নাম"} value={viewing.name || "—"} />
                <Field label={lang === "en" ? "Phone" : "ফোন"} value={viewing.phone} />
                <Field label={lang === "en" ? "Email" : "ইমেইল"} value={viewing.email || "—"} />
                <Field label={lang === "en" ? "City" : "শহর"} value={viewing.city || "—"} />
                <div className="col-span-2">
                  <Field label={lang === "en" ? "Address" : "ঠিকানা"} value={viewing.address || "—"} />
                </div>
                {viewing.notes && (
                  <div className="col-span-2">
                    <Field label={lang === "en" ? "Notes" : "নোট"} value={viewing.notes} />
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">{lang === "en" ? "Cart" : "কার্ট"}</div>
                <div className="space-y-2">
                  {parseCart(viewing.cart_items).map((it, i) => (
                    <div key={i} className="flex justify-between border border-gray-100 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.name}</div>
                        {it.variant_label && <div className="text-xs text-gray-500">{it.variant_label}</div>}
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-xs text-gray-500">× {it.quantity}</div>
                        <div className="font-semibold">৳{Number(it.price * it.quantity).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1">
                <div className="flex justify-between text-gray-600"><span>{lang === "en" ? "Subtotal" : "সাবটোটাল"}</span><span>৳{Number(viewing.subtotal).toLocaleString()}</span></div>
                <div className="flex justify-between text-gray-600"><span>{lang === "en" ? "Shipping" : "শিপিং"}</span><span>৳{Number(viewing.shipping_cost).toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-base pt-1"><span>{lang === "en" ? "Total" : "মোট"}</span><span className="text-[#0f5931]">৳{Number(viewing.total).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-gray-900 break-words">{value}</div>
    </div>
  );
}

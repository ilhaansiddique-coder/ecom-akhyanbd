"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from "react-icons/fi";
import { TableSkeleton } from "@/components/DashboardSkeleton";

interface Coupon {
  id: number;
  code: string;
  type: "fixed" | "percentage";
  value: number;
  used_count?: number;
  max_uses?: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
  min_order_amount?: number;
}

const emptyForm = {
  code: "",
  type: "fixed" as "fixed" | "percentage",
  value: "",
  min_order_amount: "",
  max_uses: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

type FormState = typeof emptyForm;

function formatDate(dt: string | undefined) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString("bn-BD");
  } catch {
    return dt;
  }
}

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    api.admin.getCoupons()
      .then((res) => setItems(res.data || res || []))
      .catch(() => { if (!background) showToast("ডেটা লোড করতে সমস্যা হয়েছে", "error"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: Coupon) => {
    setEditId(item.id);
    setForm({
      code: item.code,
      type: item.type,
      value: String(item.value),
      min_order_amount: String(item.min_order_amount ?? ""),
      max_uses: String(item.max_uses ?? ""),
      starts_at: item.starts_at ? item.starts_at.slice(0, 16) : "",
      expires_at: item.expires_at ? item.expires_at.slice(0, 16) : "",
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      value: Number(form.value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
    };
    try {
      if (editId) {
        const res = await api.admin.updateCoupon(editId, payload);
        const updated = res.data || res;
        setItems((prev) => prev.map((x) => (x.id === editId ? { ...x, ...updated } : x)));
        showToast("কুপন আপডেট হয়েছে!");
      } else {
        const res = await api.admin.createCoupon(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast("নতুন কুপন তৈরি হয়েছে!");
      }
      setModalOpen(false);
    } catch {
      showToast("সমস্যা হয়েছে, আবার চেষ্টা করুন", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.admin.deleteCoupon(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      showToast("কুপন মুছে ফেলা হয়েছে!");
      setDeleteId(null);
    } catch {
      showToast("মুছতে সমস্যা হয়েছে", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((item) =>
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <DashboardLayout title="কুপন">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message="এই কুপনটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="কুপন খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            নতুন কুপন
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["কোড", "ধরন", "মান", "ব্যবহৃত", "সর্বোচ্চ", "মেয়াদ", "স্ট্যাটাস", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">কোনো কুপন পাওয়া যায়নি</td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-gray-800">{item.code}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.type === "percentage" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                            {item.type === "percentage" ? "শতকরা" : "নির্দিষ্ট"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0f5931] whitespace-nowrap">
                          {item.type === "percentage" ? `${toBn(item.value)}%` : `৳${toBn(item.value)}`}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{toBn(item.used_count ?? 0)}</td>
                        <td className="px-4 py-3 text-gray-600">{item.max_uses ? toBn(item.max_uses) : "—"}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.expires_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {item.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50" onMouseDown={() => setModalOpen(false)}
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-800">{editId ? "কুপন সম্পাদনা" : "নতুন কুপন"}</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>কোড *</label>
                    <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputCls} placeholder="SAVE20" />
                  </div>
                  <div>
                    <label className={labelCls}>ধরন *</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "fixed" | "percentage" })} className={inputCls}>
                      <option value="fixed">নির্দিষ্ট (৳)</option>
                      <option value="percentage">শতকরা (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>মান *</label>
                    <input required type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ন্যূনতম অর্ডার (৳)</label>
                    <input type="number" min="0" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>সর্বোচ্চ ব্যবহার</label>
                    <input type="number" min="0" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>শুরুর তারিখ</label>
                    <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>মেয়াদ শেষ</label>
                    <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-[#0f5931]" />
                  সক্রিয়
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    বাতিল
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
                    {saving ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট করুন" : "তৈরি করুন"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

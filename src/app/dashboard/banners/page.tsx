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

interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  button_text?: string;
  button_url?: string;
  image?: string;
  gradient?: string;
  emoji?: string;
  position: "hero" | "ad_section";
  sort_order: number;
  is_active: boolean;
}

const emptyForm = {
  title: "",
  subtitle: "",
  description: "",
  button_text: "",
  button_url: "",
  image: "",
  gradient: "",
  emoji: "",
  position: "hero" as "hero" | "ad_section",
  sort_order: "0",
  is_active: true,
};

type FormState = typeof emptyForm;

export default function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
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
    api.admin.getBanners()
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

  const openEdit = (item: Banner) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      subtitle: item.subtitle || "",
      description: item.description || "",
      button_text: item.button_text || "",
      button_url: item.button_url || "",
      image: item.image || "",
      gradient: item.gradient || "",
      emoji: item.emoji || "",
      position: item.position,
      sort_order: String(item.sort_order),
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, sort_order: Number(form.sort_order) };
    try {
      if (editId) {
        const res = await api.admin.updateBanner(editId, payload);
        const updated = res.data || res;
        setItems((prev) => prev.map((x) => (x.id === editId ? { ...x, ...updated } : x)));
        showToast("ব্যানার আপডেট হয়েছে!");
      } else {
        const res = await api.admin.createBanner(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast("নতুন ব্যানার তৈরি হয়েছে!");
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
      await api.admin.deleteBanner(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      showToast("ব্যানার মুছে ফেলা হয়েছে!");
      setDeleteId(null);
    } catch {
      showToast("মুছতে সমস্যা হয়েছে", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <DashboardLayout title="ব্যানার">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message="এই ব্যানারটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।"
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
              placeholder="ব্যানার খুঁজুন..."
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
            নতুন ব্যানার
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
                    {["শিরোনাম", "পজিশন", "সর্ট", "স্ট্যাটাস", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">কোনো ব্যানার পাওয়া যায়নি</td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{item.emoji && <span className="mr-1">{item.emoji}</span>}{item.title}</div>
                          {item.subtitle && <div className="text-xs text-gray-400">{item.subtitle}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.position === "hero" ? "bg-purple-100 text-purple-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {item.position === "hero" ? "হিরো" : "বিজ্ঞাপন"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{toBn(item.sort_order)}</td>
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
              className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-800">{editId ? "ব্যানার সম্পাদনা" : "নতুন ব্যানার"}</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>শিরোনাম *</label>
                    <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>সাবটাইটেল</label>
                    <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>বাটন টেক্সট</label>
                    <input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>বাটন URL</label>
                    <input value={form.button_url} onChange={(e) => setForm({ ...form, button_url: e.target.value })} className={inputCls} placeholder="https://..." />
                  </div>
                  <div>
                    <label className={labelCls}>ছবি URL</label>
                    <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className={inputCls} placeholder="https://..." />
                  </div>
                  <div>
                    <label className={labelCls}>গ্রেডিয়েন্ট</label>
                    <input value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} className={inputCls} placeholder="from-green-400 to-blue-500" />
                  </div>
                  <div>
                    <label className={labelCls}>ইমোজি</label>
                    <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className={inputCls} placeholder="🎉" />
                  </div>
                  <div>
                    <label className={labelCls}>পজিশন *</label>
                    <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as "hero" | "ad_section" })} className={inputCls}>
                      <option value="hero">হিরো</option>
                      <option value="ad_section">বিজ্ঞাপন সেকশন</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>সর্ট ক্রম</label>
                    <input type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>বিবরণ</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + " resize-none"} />
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { useChannel } from "@/lib/useChannel";
import { useAutoSlug } from "@/lib/useAutoSlug";
import { TableSkeleton } from "@/components/DashboardSkeleton";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  sort?: number;
  is_active: boolean;
  products_count?: number;
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  sort: "0",
  is_active: true,
};
type FormState = typeof emptyForm;

// slugify removed — using useAutoSlug hook

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
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
    api.admin.getCategories()
      .then((res) => setItems(res.data || res || []))
      .catch(() => { if (!background) showToast("ডেটা লোড করতে সমস্যা হয়েছে", "error"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useChannel("categories", ".category.changed", () => { fetchAll(true); });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      sort: String(c.sort ?? 0),
      is_active: c.is_active,
    });
    setModalOpen(true);
  };

  const generateSlug = useAutoSlug();

  const handleNameChange = (val: string) => {
    setForm((prev) => ({ ...prev, name: val }));
    if (!editId) {
      generateSlug(val, (slug) => setForm((prev) => ({ ...prev, slug })));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, sort: Number(form.sort) };
    try {
      if (editId) {
        const res = await api.admin.updateCategory(editId, payload);
        const updated = res.data || res;
        setItems((prev) => prev.map((c) => (c.id === editId ? { ...c, ...updated } : c)));
        showToast("ক্যাটাগরি আপডেট হয়েছে!");
      } else {
        const res = await api.admin.createCategory(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast("নতুন ক্যাটাগরি তৈরি হয়েছে!");
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
      await api.admin.deleteCategory(deleteId);
      setItems((prev) => prev.filter((c) => c.id !== deleteId));
      showToast("ক্যাটাগরি মুছে ফেলা হয়েছে!");
      setDeleteId(null);
    } catch {
      showToast("মুছতে সমস্যা হয়েছে", "error");
    } finally {
      setDeleting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <DashboardLayout title="ক্যাটাগরি">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message="এই ক্যাটাগরিটি মুছে ফেলতে চান?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex justify-end">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            নতুন ক্যাটাগরি
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
                    {["নাম", "স্লাগ", "পণ্য সংখ্যা", "সর্ট", "স্ট্যাটাস", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400">কোনো ক্যাটাগরি পাওয়া যায়নি</td></tr>
                  ) : items.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.slug}</td>
                      <td className="px-4 py-3 text-gray-600">{toBn(c.products_count ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{toBn(c.sort ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50" onMouseDown={() => setModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-800">{editId ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"}</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><FiX className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className={labelCls}>নাম *</label>
                  <input required value={form.name} onChange={(e) => handleNameChange(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>স্লাগ *</label>
                  <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>বিবরণ</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + " resize-none"} />
                </div>
                <div>
                  <label className={labelCls}>সর্ট অর্ডার</label>
                  <input type="number" min="0" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} className={inputCls} />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-[#0f5931]" />
                  সক্রিয়
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
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

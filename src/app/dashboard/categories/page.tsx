"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiPlus, FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import Modal from "@/components/Modal";
import { useChannel } from "@/lib/useChannel";
import { useAutoSlug } from "@/lib/useAutoSlug";
import { useLang } from "@/lib/LanguageContext";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import { SafeImg } from "@/components/SafeImage";

interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  sort?: number;
  is_active: boolean;
  products_count?: number;
}

const emptyForm = {
  name: "",
  slug: "",
  image: "",
  description: "",
  sort: "0",
  is_active: true,
};
type FormState = typeof emptyForm;

// slugify removed — using useAutoSlug hook

export default function CategoriesPage() {
  const { t } = useLang();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    api.admin.getCategories()
      .then((res) => setItems(res.data || res || []))
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
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
      image: c.image || "",
      description: c.description || "",
      sort: String(c.sort ?? 0),
      is_active: c.is_active,
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { showToast(t("toast.imageError"), "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast(t("toast.imageError"), "error"); return; }
    setUploading(true);
    try {
      const res = await api.admin.upload(file);
      setForm((prev) => ({ ...prev, image: res.url || res.path }));
      showToast(t("toast.imageUploaded"));
    } catch { showToast(t("toast.imageError"), "error"); }
    finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleImageUpload(file); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ""; };

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
    const payload = { ...form, sort: Number(form.sort), image: form.image || null };
    try {
      if (editId) {
        const res = await api.admin.updateCategory(editId, payload);
        const updated = res.data || res;
        setItems((prev) => prev.map((c) => (c.id === editId ? { ...c, ...updated } : c)));
        showToast(t("toast.updated"));
      } else {
        const res = await api.admin.createCategory(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast(t("toast.created"));
      }
      setModalOpen(false);
    } catch {
      showToast(t("toast.error"), "error");
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
      showToast(t("toast.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("common.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("dash.categories")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message={t("confirm.deleteCategory")}
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
            {t("btn.addCategory")}
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
                    {[t("th.image"), t("th.name"), t("th.slug"), t("th.products_count"), t("th.sort"), t("th.status"), t("th.actions")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">{t("empty.categories")}</td></tr>
                  ) : items.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {c.image ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100">
                            <SafeImg src={c.image} alt={c.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">—</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.slug}</td>
                      <td className="px-4 py-3 text-gray-600">{toBn(c.products_count ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{toBn(c.sort ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.is_active ? t("form.active") : t("form.inactive")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="সম্পাদনা">
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="মুছুন">
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                          <a href={`/shop?category=${c.id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="পণ্য দেখুন">
                            <FiEye className="w-3.5 h-3.5" />
                          </a>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("modal.editCategory") : t("modal.newCategory")} size="md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>{t("form.name")} *</label>
            <input required value={form.name} onChange={(e) => handleNameChange(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.slug")} *</label>
            <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.description")}</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + " resize-none"} />
          </div>
          {/* Image Upload (Optional) */}
          <div>
            <label className={labelCls}>{t("form.imageOptional")}</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl transition-colors ${dragOver ? "border-[#0f5931] bg-green-50/50" : "border-gray-200 hover:border-gray-300"}`}
            >
              {form.image ? (
                <div className="p-3 flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                    <SafeImg src={form.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{form.image.split("/").pop()}</p>
                    <div className="flex gap-2 mt-1.5">
                      <label className="cursor-pointer px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors">
                        পরিবর্তন
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                      </label>
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, image: "" }))} className="px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium text-red-600 transition-colors">মুছুন</button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-6 cursor-pointer">
                  <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  <span className="text-xs text-gray-400">{uploading ? t("misc.uploading") : t("misc.dragDrop")}</span>
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("form.sortOrder")}</label>
            <input type="number" min="0" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-[#0f5931]" />
            {t("form.active")}
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">{t("btn.cancel")}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
              {saving ? t("btn.saving") : editId ? t("btn.update") : t("btn.create")}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

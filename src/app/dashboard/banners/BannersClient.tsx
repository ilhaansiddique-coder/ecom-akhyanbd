"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import { useLang } from "@/lib/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import Modal from "@/components/Modal";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import InlineSelect from "@/components/InlineSelect";

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

interface InitialData { items: Banner[] }

export default function BannersClient({ initialData }: { initialData?: InitialData }) {
  const { t } = useLang();
  const [items, setItems] = useState<Banner[]>(initialData?.items ?? []);
  const [loading, setLoading] = useState(false);
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
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, []);

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
        showToast(t("banners.updated"));
      } else {
        const res = await api.admin.createBanner(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast(t("banners.created"));
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
      await api.admin.deleteBanner(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      showToast(t("banners.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("common.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("banners.title")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message={t("banners.confirmDelete")}
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
              placeholder={t("banners.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            {t("banners.addNew")}
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
                    {[t("banners.labelTitle").replace(" *", ""), t("banners.labelPosition").replace(" *", ""), t("th.sort"), t("th.status"), ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">{t("banners.empty")}</td>
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
                            {item.position === "hero" ? t("banners.positionHero") : t("banners.positionAd")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{toBn(item.sort_order)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {item.is_active ? t("common.active") : t("common.inactive")}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("banners.editTitle") : t("banners.newTitle")} size="xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("banners.labelTitle")}</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("banners.labelSubtitle")}</label>
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("banners.labelButtonText")}</label>
              <input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("banners.labelButtonUrl")}</label>
              <input value={form.button_url} onChange={(e) => setForm({ ...form, button_url: e.target.value })} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>{t("banners.labelImageUrl")}</label>
              <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className={inputCls} placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>{t("banners.labelGradient")}</label>
              <input value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} className={inputCls} placeholder="from-green-400 to-blue-500" />
            </div>
            <div>
              <label className={labelCls}>{t("banners.labelEmoji")}</label>
              <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className={inputCls} placeholder="🎉" />
            </div>
            <div>
              <label className={labelCls}>{t("banners.labelPosition")}</label>
              <InlineSelect fullWidth value={form.position} options={[{ value: "hero", label: t("banners.positionHero") }, { value: "ad_section", label: t("banners.adSection") }]} onChange={(v) => setForm({ ...form, position: v as "hero" | "ad_section" })} />
            </div>
            <div>
              <label className={labelCls}>{t("banners.labelSortOrder")}</label>
              <input type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t("banners.labelDescription")}</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + " resize-none"} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-[var(--primary)]" />
            {t("common.active")}
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {t("btn.cancel")}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50">
              {saving ? t("btn.saving") : editId ? t("btn.update") : t("btn.create")}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

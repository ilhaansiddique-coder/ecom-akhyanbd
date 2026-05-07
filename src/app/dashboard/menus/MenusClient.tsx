"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import { useLang } from "@/lib/LanguageContext";
import { useSyncRefresh } from "@/lib/useSyncRefresh";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import Modal from "@/components/Modal";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";

interface Menu {
  id: number;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm = {
  label: "",
  url: "",
  sort_order: "0",
  is_active: true,
};

type FormState = typeof emptyForm;

interface InitialData { items: Menu[] }

export default function MenusClient({ initialData }: { initialData?: InitialData }) {
  const { t } = useLang();
  const [items, setItems] = useState<Menu[]>(initialData?.items ?? []);
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
    api.admin.getMenus()
      .then((res) => setItems(res.data || res || []))
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, []);

  // Live refresh — refetch when backend bumps these channels.
  useSyncRefresh(["menus"], () => fetchAll(true));

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: Menu) => {
    setEditId(item.id);
    setForm({
      label: item.label,
      url: item.url,
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
        const res = await api.admin.updateMenu(editId, payload);
        const updated = res.data || res;
        setItems((prev) => prev.map((x) => (x.id === editId ? { ...x, ...updated } : x)));
        showToast(t("menus.updated"));
      } else {
        const res = await api.admin.createMenu(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast(t("menus.created"));
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
      await api.admin.deleteMenu(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      showToast(t("menus.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("common.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("menus.title")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message={t("menus.confirmDelete")}
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
              placeholder={t("menus.search")}
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
            {t("menus.addNew")}
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
                    {[t("menus.labelLabel").replace(" *", ""), "URL", t("th.sort"), t("th.status"), ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">{t("menus.empty")}</td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">{item.label}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.url}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("menus.editTitle") : t("menus.newTitle")} size="md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>{t("menus.labelLabel")}</label>
            <input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("menus.labelUrl")}</label>
            <input required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputCls} placeholder="/category/xyz" />
          </div>
          <div>
            <label className={labelCls}>{t("menus.labelSortOrder")}</label>
            <input type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputCls} />
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

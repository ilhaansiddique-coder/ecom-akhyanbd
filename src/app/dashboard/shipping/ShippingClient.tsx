"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toBn, parseNum } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import Modal from "@/components/Modal";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/LanguageContext";

interface ShippingZone {
  id: number;
  name: string;
  cities: string[];
  rate: number;
  estimated_days: string;
  is_active: boolean;
}

const emptyForm = {
  name: "",
  cities: "",
  rate: "",
  estimated_days: "",
  is_active: true,
};

type FormState = typeof emptyForm;

interface InitialData { items: ShippingZone[] }

export default function ShippingClient({ initialData }: { initialData?: InitialData }) {
  const { t } = useLang();
  const [items, setItems] = useState<ShippingZone[]>(initialData?.items ?? []);
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
    api.admin.getShippingZones()
      .then((res) => setItems(res.data || res || []))
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: ShippingZone) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      cities: Array.isArray(item.cities) ? item.cities.join(", ") : "",
      rate: String(item.rate),
      estimated_days: String(item.estimated_days),
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const citiesArray = form.cities
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const payload = {
      ...form,
      cities: citiesArray,
      rate: parseNum(form.rate),
      estimated_days: form.estimated_days || null,
    };
    try {
      if (editId) {
        const res = await api.admin.updateShippingZone(editId, payload);
        const updated = res.data || res;
        setItems((prev) => prev.map((x) => (x.id === editId ? { ...x, ...updated } : x)));
        showToast(t("shipping.updated"));
      } else {
        const res = await api.admin.createShippingZone(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast(t("shipping.created"));
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
      await api.admin.deleteShippingZone(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      showToast(t("shipping.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("shipping.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("shipping.title")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message={t("shipping.deleteConfirm")}
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
              placeholder={t("shipping.search")}
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
            {t("shipping.newZone")}
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
                    {[t("shipping.name"), t("shipping.cities"), t("shipping.rate"), t("shipping.estDays"), t("shipping.status"), ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">{t("shipping.noZones")}</td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-48">
                          <span className="truncate block">{Array.isArray(item.cities) ? item.cities.join(", ") : "—"}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--primary)]">৳{toBn(item.rate)}</td>
                        <td className="px-4 py-3 text-gray-600">{item.estimated_days || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {item.is_active ? t("shipping.active") : t("shipping.inactive")}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("shipping.editTitle") : t("shipping.createTitle")} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>{t("shipping.nameLabel")}</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder={t("shipping.namePlaceholder")} />
          </div>
          <div>
            <label className={labelCls}>{t("shipping.citiesLabel")}</label>
            <input required value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} className={inputCls} placeholder={t("shipping.citiesPlaceholder")} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("shipping.rateLabel")}</label>
              <input required value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={inputCls} placeholder={t("shipping.ratePlaceholder")} inputMode="numeric" />
            </div>
            <div>
              <label className={labelCls}>{t("shipping.estDaysLabel")}</label>
              <input value={form.estimated_days} onChange={(e) => setForm({ ...form, estimated_days: e.target.value })} className={inputCls} placeholder={t("shipping.estDaysPlaceholder")} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-[var(--primary)]" />
            {t("shipping.active")}
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

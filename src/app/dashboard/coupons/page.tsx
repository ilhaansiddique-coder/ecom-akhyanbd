"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import Modal from "@/components/Modal";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import InlineSelect from "@/components/InlineSelect";
import { useLang } from "@/lib/LanguageContext";

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

function formatDate(dt: string | undefined, lang: string = "bn") {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD");
  } catch {
    return dt;
  }
}

export default function CouponsPage() {
  const { t, lang } = useLang();
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
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
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
        showToast(t("toast.updated"));
      } else {
        const res = await api.admin.createCoupon(payload);
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
      await api.admin.deleteCoupon(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      showToast(t("toast.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("toast.error"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((item) =>
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("coupon.title")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message={t("coupon.deleteConfirm")}
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
              placeholder={t("coupon.search")}
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
            {t("coupon.addNew")}
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
                    {[t("coupon.code"), t("coupon.type"), t("coupon.value"), t("coupon.used"), t("coupon.maxUses"), t("coupon.expires"), t("th.status"), ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">{t("coupon.empty")}</td>
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
                            {item.type === "percentage" ? t("coupon.percentage") : t("coupon.fixed")}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0f5931] whitespace-nowrap">
                          {item.type === "percentage" ? `${toBn(item.value)}%` : `৳${toBn(item.value)}`}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{toBn(item.used_count ?? 0)}</td>
                        <td className="px-4 py-3 text-gray-600">{item.max_uses ? toBn(item.max_uses) : "—"}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.expires_at, lang)}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("coupon.editCoupon") : t("coupon.newCoupon")} size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("coupon.code")} *</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={inputCls} placeholder="SAVE20" />
            </div>
            <div>
              <label className={labelCls}>{t("coupon.type")} *</label>
              <InlineSelect fullWidth value={form.type} options={[{ value: "fixed", label: t("coupon.fixed") }, { value: "percentage", label: t("coupon.percentage") }]} onChange={(v) => setForm({ ...form, type: v as "fixed" | "percentage" })} />
            </div>
            <div>
              <label className={labelCls}>{t("coupon.value")} *</label>
              <input required type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("coupon.minOrder")}</label>
              <input type="number" min="0" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("coupon.maxUses")}</label>
              <input type="number" min="0" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("flash.start")}</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("coupon.expires")}</label>
              <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-[#0f5931]" />
            {t("form.active")}
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {t("btn.cancel")}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
              {saving ? t("btn.saving") : editId ? t("btn.update") : t("btn.create")}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

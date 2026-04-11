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
import StatusFilter from "@/components/StatusFilter";
import { useLang } from "@/lib/LanguageContext";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "customer",
};
type FormState = typeof emptyForm;

export default function UsersPage() {
  const { t, lang } = useLang();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
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
    const params = roleFilter ? `role=${roleFilter}` : "";
    api.admin.getUsers(params)
      .then((res) => setUsers(res.data || res || []))
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, [roleFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, password: "", phone: u.phone || "", role: u.role });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = { name: form.name, email: form.email, phone: form.phone, role: form.role };
    if (form.password) payload.password = form.password;
    try {
      if (editId) {
        const res = await api.admin.updateUser(editId, payload);
        const updated = res.data || res;
        setUsers((prev) => prev.map((x) => (x.id === editId ? { ...x, ...updated } : x)));
        showToast(t("toast.updated"));
      } else {
        payload.password = form.password;
        const res = await api.admin.createUser(payload);
        const created = res.data || res;
        setUsers((prev) => [created, ...prev]);
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
      await api.admin.deleteUser(deleteId);
      setUsers((prev) => prev.filter((x) => x.id !== deleteId));
      showToast(t("toast.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("toast.error"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
  });

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("user.title")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message={t("user.deleteConfirm")}
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
              placeholder={t("user.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none"
            />
          </div>
          <StatusFilter value={roleFilter} options={[{ value: "", label: t("user.allRoles") }, { value: "customer", label: t("user.customer"), color: "bg-blue-400" }, { value: "admin", label: t("user.admin"), color: "bg-purple-400" }]} onChange={setRoleFilter} placeholder={t("user.allRoles")} />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            {t("user.addNew")}
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
                    {["#", t("th.name"), t("th.email"), t("th.phone"), t("th.role"), t("th.date"), ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">{t("user.empty")}</td></tr>
                  ) : filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{toBn(u.id)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-44 truncate">{u.email}</td>
                      <td className="px-4 py-3 text-gray-500">{u.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {u.role === "admin" ? t("user.admin") : t("user.customer")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(u.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("user.editUser") : t("user.newUser")} size="md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>{t("form.name")} *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.email")} *</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.password")} {editId ? "" : "*"}</label>
            <input type="password" required={!editId} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.phone")}</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.role")} *</label>
            <InlineSelect fullWidth value={form.role} options={[{ value: "customer", label: t("user.customer") }, { value: "admin", label: t("user.admin") }]} onChange={(v) => setForm({ ...form, role: v })} />
          </div>
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

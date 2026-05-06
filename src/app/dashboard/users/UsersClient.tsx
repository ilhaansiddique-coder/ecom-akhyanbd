"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiCheckCircle, FiChevronDown, FiX } from "react-icons/fi";
import Modal from "@/components/Modal";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import InlineSelect from "@/components/InlineSelect";
import StatusFilter from "@/components/StatusFilter";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  created_at: string;
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  role: "customer",
};
type FormState = typeof emptyForm;

interface InitialData { items: User[]; total: number }

export default function UsersClient({ initialData }: { initialData?: InitialData }) {
  const { t, lang } = useLang();
  const [users, setUsers] = useState<User[]>(initialData?.items ?? []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  // Current admin's id — used to disable self-selection in bulk ops.
  const { user: currentAdmin } = useAuth();
  const currentAdminId = currentAdmin?.id;

  // Bulk selection state.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRoleOpen, setBulkRoleOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);

  // Pagination — match orders/products convention. Server returns 20/page.
  // Pagination only renders when totalPages > 1 (≤20 = no controls).
  const perPage = 20;
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(initialData?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    if (roleFilter) qs.set("role", roleFilter);
    if (search.trim()) qs.set("search", search.trim());
    api.admin.getUsers(qs.toString())
      .then((res) => {
        const list = res.data || res || [];
        setUsers(list);
        const total = res?.meta?.total ?? res?.total ?? list.length;
        setTotalUsers(Number(total) || 0);
      })
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, [roleFilter, search, page]);

  // Skip the *very first* run of each effect when SSR seeded items so we
  // don't double-fetch on mount. Any subsequent dep change MUST refetch —
  // including a role filter change while the search box is empty.
  const filterMountRef = useRef(!!initialData?.items?.length);
  const searchMountRef = useRef(!!initialData?.items?.length);

  // Filter/page change → fetch immediately (no debounce — single click).
  // Splitting from search means clicking the role filter never gets
  // swallowed by the search debounce when the search box is empty.
  useEffect(() => {
    if (filterMountRef.current) { filterMountRef.current = false; return; }
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, page]);

  // Search → debounced 250ms (keystrokes).
  useEffect(() => {
    if (searchMountRef.current) { searchMountRef.current = false; return; }
    const h = setTimeout(() => fetchAll(), 250);
    return () => clearTimeout(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Reset page on filter change.
  useEffect(() => { setPage(1); }, [roleFilter, search]);

  // Clear selection whenever the visible list changes (filter / page / fetch).
  useEffect(() => { setSelectedIds([]); }, [roleFilter, search, page, users]);

  // Close the bulk-role popover on outside click.
  useEffect(() => {
    if (!bulkRoleOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-bulk-role]")) setBulkRoleOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bulkRoleOpen]);

  const toggleSelect = (id: string) => {
    if (id === currentAdminId) return; // never select self
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const selectableIds = filtered
      .map((u) => u.id)
      .filter((id) => id !== currentAdminId);
    const allSelected =
      selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : selectableIds);
  };

  const handleBulkRoleChange = async (role: "customer" | "staff" | "admin") => {
    setBulkRoleOpen(false);
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await api.admin.bulkUsers("update_role", selectedIds, role);
      setUsers((prev) =>
        prev.map((u) => (selectedIds.includes(u.id) ? { ...u, role } : u))
      );
      setSelectedIds([]);
      showToast(t("toast.updated") || "Updated");
    } catch {
      showToast(t("toast.error"), "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await api.admin.bulkUsers("delete", selectedIds);
      setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
      setTotalUsers((n) => Math.max(0, n - selectedIds.length));
      setSelectedIds([]);
      setBulkConfirmDelete(false);
      showToast(t("toast.deleted") || "Deleted");
    } catch {
      showToast(t("toast.error"), "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, password: "", phone: u.phone || "", address: u.address || "", role: u.role });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = { name: form.name, email: form.email, phone: form.phone, address: form.address, role: form.role };
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
    } catch (err: any) {
      const msg = err?.errors ? Object.values(err.errors).flat().join(", ") : err?.message || t("toast.error");
      showToast(msg, "error");
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

  // Search filtered server-side now. Defensive role check still local so
  // optimistic role updates leave the view immediately.
  const filtered = users.filter((u) => !roleFilter || u.role === roleFilter);

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
      <ConfirmDialog
        open={bulkConfirmDelete}
        message={`Delete ${selectedIds.length} user${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmDelete(false)}
        loading={bulkLoading}
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
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <StatusFilter value={roleFilter} options={[{ value: "", label: t("user.allRoles") }, { value: "customer", label: t("user.customer"), color: "bg-blue-400" }, { value: "staff", label: t("user.staff"), color: "bg-emerald-400" }, { value: "admin", label: t("user.admin"), color: "bg-purple-400" }]} onChange={setRoleFilter} placeholder={t("user.allRoles")} />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            {t("user.addNew")}
          </button>
        </div>

        {/* ── Bulk Action Toolbar ── */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3"
          >
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.length} selected
            </span>
            <div className="flex-1" />
            {/* Bulk role change */}
            <div className="relative" data-bulk-role>
              <button
                type="button"
                onClick={() => setBulkRoleOpen((o) => !o)}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <FiCheckCircle className="w-4 h-4 text-gray-500" />
                Change Role
                <FiChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${bulkRoleOpen ? "rotate-180" : ""}`} />
              </button>
              {bulkRoleOpen && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-xl min-w-44 py-1">
                  {[
                    { value: "customer", label: t("user.customer"), dot: "bg-blue-400" },
                    { value: "staff", label: t("user.staff"), dot: "bg-emerald-400" },
                    { value: "admin", label: t("user.admin"), dot: "bg-purple-400" },
                  ].map(({ value, label, dot }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleBulkRoleChange(value as "customer" | "staff" | "admin")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Bulk delete */}
            <button
              type="button"
              onClick={() => setBulkConfirmDelete(true)}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <FiTrash2 className="w-4 h-4" />
              Delete
            </button>
            {/* Clear */}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FiX className="w-4 h-4" />
              Clear
            </button>
          </motion.div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filtered.length > 0 &&
                          filtered.filter((u) => u.id !== currentAdminId).every((u) => selectedIds.includes(u.id)) &&
                          filtered.some((u) => u.id !== currentAdminId)
                        }
                        onChange={toggleSelectAll}
                        className={theme.checkbox}
                        aria-label="Select all"
                      />
                    </th>
                    {["#", t("th.name"), t("th.email"), t("th.phone"), t("th.role"), t("th.date"), ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400">{t("user.empty")}</td></tr>
                  ) : filtered.map((u) => (
                    <tr
                      key={u.id}
                      className={`transition-colors ${selectedIds.includes(u.id) ? "bg-primary/5" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          disabled={u.id === currentAdminId}
                          className={`${theme.checkbox} disabled:opacity-30 disabled:cursor-not-allowed`}
                          aria-label={`Select ${u.name}`}
                          title={u.id === currentAdminId ? "You cannot select yourself" : ""}
                          suppressHydrationWarning
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{toBn(u.id)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-44 truncate">{u.email}</td>
                      <td className="px-4 py-3 text-gray-500">{u.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "staff" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                          {u.role === "admin" ? t("user.admin") : u.role === "staff" ? t("user.staff") : t("user.customer")}
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

        {/* Pagination — only shows when total > perPage */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-gray-400">
              {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalUsers)} / {totalUsers}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >{lang === "en" ? "← Prev" : "← আগের"}</button>
              <span className="px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">
                {lang === "en" ? `${page} / ${totalPages}` : `${toBn(page)} / ${toBn(totalPages)}`}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >{lang === "en" ? "Next →" : "পরের →"}</button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("user.editUser") : t("user.newUser")} size="md">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>{t("form.name")} *</label>
            <input required value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.email")} *</label>
            <input required type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.password")} {editId ? "" : "*"}</label>
            <input type="password" required={!editId} minLength={8} value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder={lang === "en" ? "Min 8 characters" : "সর্বনিম্ন ৮ অক্ষর"} />
          </div>
          <div>
            <label className={labelCls}>{t("form.phone")}</label>
            <input type="tel" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("form.address")}</label>
            <textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls + " resize-none"} placeholder={lang === "en" ? "Full address..." : "সম্পূর্ণ ঠিকানা..."} />
          </div>
          <div>
            <label className={labelCls}>{t("form.role")} *</label>
            <InlineSelect fullWidth value={form.role} options={[{ value: "customer", label: t("user.customer") }, { value: "staff", label: t("user.staff") }, { value: "admin", label: t("user.admin") }]} onChange={(v) => setForm({ ...form, role: v })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">{t("btn.cancel")}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50">
              {saving ? t("btn.saving") : editId ? t("btn.update") : t("btn.create")}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

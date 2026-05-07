"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import Modal from "@/components/Modal";
import { FiTrash2, FiStar, FiEdit2 } from "react-icons/fi";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import InlineSelect from "@/components/InlineSelect";
import StatusFilter from "@/components/StatusFilter";
import { SafeImg } from "@/components/SafeImage";
import { useLang } from "@/lib/LanguageContext";
import { useSyncRefresh } from "@/lib/useSyncRefresh";
import { theme } from "@/lib/theme";

interface Review {
  id: number;
  product_name?: string;
  product?: { name: string };
  customer_name: string;
  rating: number;
  review: string;
  image?: string;
  is_approved: boolean;
  created_at: string;
}

function useFilterOptions() {
  const { t } = useLang();
  return [
    { value: "", label: t("filter.allReviews"), color: "" },
    { value: "approved", label: t("filter.approved"), color: "bg-green-400" },
    { value: "pending", label: t("filter.pending"), color: "bg-yellow-400" },
  ];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <FiStar key={i} className={`w-3.5 h-3.5 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function ClickableStars({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          type="button"
          key={i}
          onClick={() => onChange(i + 1)}
          className="p-0.5 hover:scale-125 transition-transform"
        >
          <FiStar className={`w-5 h-5 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300"}`} />
        </button>
      ))}
    </div>
  );
}

const inputCls = theme.input;
const labelCls = theme.label;

interface InitialData { items: Review[]; total: number }

export default function ReviewsClient({ initialData }: { initialData?: InitialData }) {
  const { t, lang } = useLang();
  const FILTER_OPTIONS = useFilterOptions();
  const [reviews, setReviews] = useState<Review[]>(initialData?.items ?? []);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  // Edit modal
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [editForm, setEditForm] = useState({ customer_name: "", rating: 5, review: "", image: "", is_approved: false });
  const [editSaving, setEditSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    const params = filter ? `status=${filter}` : "";
    api.admin.getReviews(params)
      .then((res) => setReviews(res.data || res || []))
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
      .finally(() => setLoading(false));
  }, [filter]);

  // Live refresh — refetch when backend bumps these channels.
  useSyncRefresh(["reviews"], () => fetchAll(true));

  const openEdit = (r: Review) => {
    setEditReview(r);
    setEditForm({
      customer_name: r.customer_name,
      rating: r.rating,
      review: r.review,
      image: r.image || "",
      is_approved: r.is_approved,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReview) return;
    setEditSaving(true);
    try {
      const res = await api.admin.updateReview(editReview.id, {
        ...editForm,
        image: editForm.image || null,
      });
      const updated = res.data || res;
      setReviews((prev) => prev.map((r) => (r.id === editReview.id ? { ...r, ...updated } : r)));
      setEditReview(null);
      showToast(t("toast.updated"));
    } catch {
      showToast(t("toast.error"), "error");
    } finally {
      setEditSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { showToast(t("toast.imageError"), "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast(t("toast.imageError"), "error"); return; }
    setUploading(true);
    try {
      const res = await api.admin.upload(file);
      setEditForm((prev) => ({ ...prev, image: res.url || res.path }));
      showToast(t("toast.imageUploaded"));
    } catch { showToast(t("toast.imageError"), "error"); }
    finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleImageUpload(file); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ""; };

  const handleToggleApproval = async (review: Review) => {
    try {
      await api.admin.updateReview(review.id, { is_approved: !review.is_approved });
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, is_approved: !r.is_approved } : r)));
      showToast(t("toast.updated"));
    } catch {
      showToast(t("toast.error"), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.admin.deleteReview(deleteId);
      setReviews((prev) => prev.filter((x) => x.id !== deleteId));
      showToast(t("toast.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("common.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout title={t("dash.reviews")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog open={!!deleteId} message={t("confirm.deleteReview")} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex items-center gap-3">
          <StatusFilter value={filter} options={FILTER_OPTIONS} onChange={setFilter} placeholder={t("filter.allReviews")} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[t("th.image"), t("dash.products"), t("th.customer"), t("th.rating"), t("th.review"), t("th.approved"), t("th.date"), t("th.actions")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reviews.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400">{t("empty.reviews")}</td></tr>
                  ) : reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {r.image ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100">
                            <SafeImg src={r.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">—</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-36 truncate">
                        {r.product?.name || r.product_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.customer_name}</td>
                      <td className="px-4 py-3">
                        <Stars rating={r.rating} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-52">
                        <p className="line-clamp-2 text-xs">{r.review}</p>
                      </td>
                      <td className="px-4 py-3">
                        <InlineSelect
                          value={r.is_approved ? "approved" : "pending"}
                          options={[
                            { value: "approved", label: t("filter.approved"), color: "bg-green-400" },
                            { value: "pending", label: t("filter.pending"), color: "bg-yellow-400" },
                          ]}
                          onChange={(v) => {
                            const shouldApprove = v === "approved";
                            if (shouldApprove !== r.is_approved) handleToggleApproval(r);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="সম্পাদনা">
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteId(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="মুছুন">
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

      {/* Edit Review Modal */}
      <Modal open={!!editReview} onClose={() => setEditReview(null)} title={editReview ? `${t("modal.editReview")} #${toBn(editReview.id)}` : ""} size="lg">
        {editReview && (
          <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
            {/* Product (read-only) */}
            <div>
              <label className={labelCls}>{t("dash.products")}</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-600">
                {editReview.product?.name || editReview.product_name || "—"}
              </div>
            </div>

            {/* Customer name */}
            <div>
              <label className={labelCls}>{t("form.customerName")} *</label>
              <input required value={editForm.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} className={inputCls} />
            </div>

            {/* Rating */}
            <div>
              <label className={labelCls}>{t("form.rating")} *</label>
              <ClickableStars rating={editForm.rating} onChange={(r) => setEditForm({ ...editForm, rating: r })} />
            </div>

            {/* Review text */}
            <div>
              <label className={labelCls}>{t("form.review")} *</label>
              <textarea required rows={3} value={editForm.review} onChange={(e) => setEditForm({ ...editForm, review: e.target.value })} className={inputCls + " resize-none"} />
            </div>

            {/* Image upload */}
            <div>
              <label className={labelCls}>{t("form.imageOptional")}</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl transition-colors ${dragOver ? "border-[var(--primary)] bg-green-50/50" : "border-gray-200 hover:border-gray-300"}`}
              >
                {editForm.image ? (
                  <div className="p-3 flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                      <SafeImg src={editForm.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate">{editForm.image.split("/").pop()}</p>
                      <div className="flex gap-2 mt-1.5">
                        <label className="cursor-pointer px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors">
                          পরিবর্তন
                          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        </label>
                        <button type="button" onClick={() => setEditForm({ ...editForm, image: "" })} className="px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium text-red-600 transition-colors">
                          মুছুন
                        </button>
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

            {/* Approval status */}
            <div>
              <label className={labelCls}>{t("th.status")}</label>
              <InlineSelect
                fullWidth
                value={editForm.is_approved ? "approved" : "pending"}
                options={[
                  { value: "approved", label: t("filter.approved"), color: "bg-green-400" },
                  { value: "pending", label: t("filter.pending"), color: "bg-yellow-400" },
                ]}
                onChange={(v) => setEditForm({ ...editForm, is_approved: v === "approved" })}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditReview(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                {t("btn.cancel")}
              </button>
              <button type="submit" disabled={editSaving} className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50">
                {editSaving ? t("btn.saving") : t("btn.update")}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
}

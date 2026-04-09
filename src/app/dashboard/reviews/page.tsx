"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { FiTrash2, FiStar, FiCheck, FiX } from "react-icons/fi";
import { TableSkeleton } from "@/components/DashboardSkeleton";

interface Review {
  id: number;
  product_name?: string;
  product?: { name: string };
  customer_name: string;
  rating: number;
  review: string;
  is_approved: boolean;
  created_at: string;
}

const FILTER_OPTIONS = [
  { value: "", label: "সব" },
  { value: "approved", label: "অনুমোদিত" },
  { value: "pending", label: "অপেক্ষমাণ" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <FiStar
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    const params = filter ? `status=${filter}` : "";
    api.admin.getReviews(params)
      .then((res) => setReviews(res.data || res || []))
      .catch(() => { if (!background) showToast("ডেটা লোড করতে সমস্যা হয়েছে", "error"); })
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleApproval = async (review: Review) => {
    setTogglingId(review.id);
    try {
      await api.admin.updateReview(review.id, { is_approved: !review.is_approved });
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, is_approved: !r.is_approved } : r)));
      showToast(review.is_approved ? "রিভিউ প্রত্যাখ্যান করা হয়েছে" : "রিভিউ অনুমোদন করা হয়েছে!");
    } catch {
      showToast("আপডেট করতে সমস্যা হয়েছে", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.admin.deleteReview(deleteId);
      setReviews((prev) => prev.filter((x) => x.id !== deleteId));
      showToast("রিভিউ মুছে ফেলা হয়েছে!");
      setDeleteId(null);
    } catch {
      showToast("মুছতে সমস্যা হয়েছে", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout title="রিভিউ">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message="এই রিভিউটি মুছে ফেলতে চান?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Filter */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f.value
                    ? "bg-[#0f5931] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["পণ্য", "গ্রাহক", "রেটিং", "রিভিউ", "অনুমোদিত", "তারিখ", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reviews.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">কোনো রিভিউ পাওয়া যায়নি</td></tr>
                  ) : reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-36 truncate">
                        {r.product?.name || r.product_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.customer_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Stars rating={r.rating} />
                          <span className="text-xs text-gray-500">{toBn(r.rating)}/৫</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-52">
                        <p className="line-clamp-2 text-xs">{r.review}</p>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleApproval(r)}
                          disabled={togglingId === r.id}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-50 ${
                            r.is_approved
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {r.is_approved ? (
                            <><FiCheck className="w-3 h-3" /> অনুমোদিত</>
                          ) : (
                            <><FiX className="w-3 h-3" /> অপেক্ষমাণ</>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("bn-BD")}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

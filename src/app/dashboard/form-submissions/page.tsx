"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiPhone, FiUser, FiCalendar, FiTrash2, FiChevronDown, FiChevronUp, FiCheck, FiEye, FiMessageSquare } from "react-icons/fi";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLang } from "@/lib/LanguageContext";
import { toBn } from "@/utils/toBn";
import { TableSkeleton } from "@/components/DashboardSkeleton";

interface Submission {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: string;
  notes?: string;
  created_at: string;
}

const subjectLabels: Record<string, string> = {
  order: "অর্ডার সংক্রান্ত",
  product: "পণ্য সংক্রান্ত",
  delivery: "ডেলিভারি সংক্রান্ত",
  refund: "রিফান্ড/রিটার্ন",
  other: "অন্যান্য",
};

const statusColors: Record<string, string> = {
  unread: "bg-red-100 text-red-700",
  read: "bg-blue-100 text-blue-700",
  replied: "bg-green-100 text-green-700",
};

export default function FormSubmissionsPage() {
  const { lang } = useLang();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const [filter, setFilter] = useState<string>("");

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ message: msg, type });

  useEffect(() => {
    fetch("/api/v1/admin/form-submissions", { credentials: "include", headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(data => setSubmissions(Array.isArray(data) ? data : []))
      .catch(() => showToast(lang === "en" ? "Failed to load" : "লোড করতে সমস্যা", "error"))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/v1/admin/form-submissions/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    } catch {
      showToast(lang === "en" ? "Update failed" : "আপডেট ব্যর্থ", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/v1/admin/form-submissions/${deleteId}`, {
        method: "DELETE", credentials: "include",
      });
      setSubmissions(prev => prev.filter(s => s.id !== deleteId));
      showToast(lang === "en" ? "Deleted" : "মুছে ফেলা হয়েছে");
    } catch {
      showToast(lang === "en" ? "Delete failed" : "মুছতে সমস্যা", "error");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filtered = filter ? submissions.filter(s => s.status === filter) : submissions;
  const unreadCount = submissions.filter(s => s.status === "unread").length;

  return (
    <DashboardLayout title={lang === "en" ? "Form Submissions" : "ফর্ম সাবমিশন"}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog open={!!deleteId} message={lang === "en" ? "Delete this submission?" : "এই সাবমিশন মুছে ফেলতে চান?"} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />

      {loading ? <TableSkeleton /> : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 text-sm">
              <span className="text-gray-500">{lang === "en" ? "Total" : "মোট"}:</span>{" "}
              <span className="font-bold">{toBn(submissions.length)}</span>
            </div>
            {unreadCount > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-100 px-4 py-2.5 text-sm text-red-700">
                <span>{lang === "en" ? "Unread" : "অপঠিত"}:</span>{" "}
                <span className="font-bold">{toBn(unreadCount)}</span>
              </div>
            )}
            <div className="flex gap-1 ml-auto">
              {[
                { v: "", l: lang === "en" ? "All" : "সব" },
                { v: "unread", l: lang === "en" ? "Unread" : "অপঠিত" },
                { v: "read", l: lang === "en" ? "Read" : "পঠিত" },
                { v: "replied", l: lang === "en" ? "Replied" : "উত্তর দেওয়া" },
              ].map(f => (
                <button key={f.v} onClick={() => setFilter(f.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f.v ? "bg-[#0f5931] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              <FiMessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              {lang === "en" ? "No submissions found" : "কোনো সাবমিশন পাওয়া যায়নি"}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filtered.map(s => {
                  const isExpanded = expandedId === s.id;
                  return (
                    <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${s.status === "unread" ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}>
                      <div className="p-4 md:p-5 flex items-start gap-3 cursor-pointer" onClick={() => {
                        setExpandedId(isExpanded ? null : s.id);
                        if (s.status === "unread") updateStatus(s.id, "read");
                      }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.status === "unread" ? "bg-red-100 text-red-600" : s.status === "replied" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
                          <FiMail className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-800">{s.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[s.status] || "bg-gray-100 text-gray-600"}`}>
                              {s.status === "unread" ? (lang === "en" ? "Unread" : "অপঠিত") : s.status === "read" ? (lang === "en" ? "Read" : "পঠিত") : (lang === "en" ? "Replied" : "উত্তর দেওয়া")}
                            </span>
                            {s.subject && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{subjectLabels[s.subject] || s.subject}</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{s.message}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1"><FiMail className="w-3 h-3" />{s.email}</span>
                            {s.phone && <span className="flex items-center gap-1"><FiPhone className="w-3 h-3" />{s.phone}</span>}
                            <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" />{new Date(s.created_at).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? <FiChevronUp className="w-4 h-4 text-gray-400" /> : <FiChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-gray-100 pt-4">
                          <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <p className="text-sm text-gray-700 whitespace-pre-line">{s.message}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={`mailto:${s.email}?subject=Re: ${subjectLabels[s.subject || ""] || "আপনার বার্তা"}`}
                              onClick={() => updateStatus(s.id, "replied")}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f5931] text-white rounded-lg text-xs font-medium hover:bg-[#12693a] transition-colors">
                              <FiMail className="w-3 h-3" /> {lang === "en" ? "Reply via Email" : "ইমেইলে উত্তর দিন"}
                            </a>
                            {s.phone && (
                              <a href={`tel:${s.phone}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors">
                                <FiPhone className="w-3 h-3" /> {lang === "en" ? "Call" : "কল করুন"}
                              </a>
                            )}
                            {s.status !== "replied" && (
                              <button onClick={() => updateStatus(s.id, "replied")}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-green-300 hover:text-green-600 transition-colors">
                                <FiCheck className="w-3 h-3" /> {lang === "en" ? "Mark Replied" : "উত্তর দেওয়া চিহ্নিত"}
                              </button>
                            )}
                            {s.status === "unread" && (
                              <button onClick={() => updateStatus(s.id, "read")}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                                <FiEye className="w-3 h-3" /> {lang === "en" ? "Mark Read" : "পঠিত চিহ্নিত"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </DashboardLayout>
  );
}

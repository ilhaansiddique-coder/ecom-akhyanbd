"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toBn, parseNum } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiImage, FiUploadCloud,
} from "react-icons/fi";
import { useChannel } from "@/lib/useChannel";
import { useAutoSlug } from "@/lib/useAutoSlug";
import { TableSkeleton } from "@/components/DashboardSkeleton";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1").replace(/\/api\/v1$/, "");
function resolveImg(src: string) { return src.startsWith("/storage/") ? `${API_BASE}${src}` : src; }

interface Category { id: number; name: string; }
interface Brand { id: number; name: string; }
interface Product {
  id: number;
  name: string;
  slug: string;
  category?: { id: number; name: string };
  brand?: { id: number; name: string };
  price: number;
  original_price?: number;
  image?: string;
  badge?: string;
  weight?: string;
  stock: number;
  sold?: number;
  is_active: boolean;
  is_featured: boolean;
  description?: string;
  category_id?: number;
  brand_id?: number;
}

const emptyForm = {
  name: "",
  slug: "",
  category_id: "",
  brand_id: "",
  description: "",
  price: "",
  original_price: "",
  image: "",
  badge: "",
  weight: "",
  stock: "",
  is_active: true,
  is_featured: false,
};

type FormState = typeof emptyForm;

// slugify removed — now using useAutoSlug hook with backend transliteration

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const formRef = useRef<FormState>(emptyForm);
  // Keep ref in sync with state — ref is always latest, never stale
  formRef.current = form;
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    Promise.all([
      api.admin.getProducts(),
      api.admin.getCategories(),
      api.admin.getBrands(),
    ])
      .then(([p, c, b]) => {
        setProducts(p.data || p || []);
        setCategories(c.data || c || []);
        setBrands(b.data || b || []);
      })
      .catch(() => { if (!background) showToast("ডেটা লোড করতে সমস্যা হয়েছে", "error"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Real-time: background sync when any product is created/updated/deleted
  useChannel("products", ".product.changed", () => { fetchAll(true); });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      category_id: String(p.category?.id || p.category_id || ""),
      brand_id: String(p.brand?.id || p.brand_id || ""),
      description: p.description || "",
      price: String(p.price),
      original_price: p.original_price != null ? String(p.original_price) : "",
      image: p.image || "",
      badge: p.badge || "",
      weight: p.weight || "",
      stock: String(p.stock),
      is_active: p.is_active,
      is_featured: p.is_featured,
    });
    setModalOpen(true);
  };

  const generateSlug = useAutoSlug();

  const handleNameChange = (val: string) => {
    setForm((prev) => ({ ...prev, name: val }));
    if (!editId) {
      generateSlug(val, (slug) => setForm((prev) => ({ ...prev, slug })));
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("শুধুমাত্র ছবি ফাইল আপলোড করুন", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("ফাইলের আকার ৫MB এর বেশি হতে পারবে না", "error");
      return;
    }
    setUploading(true);
    try {
      const res = await api.admin.upload(file);
      setForm((prev) => ({ ...prev, image: res.url || res.path }));
      showToast("ছবি আপলোড হয়েছে!");
    } catch {
      showToast("ছবি আপলোড করতে সমস্যা হয়েছে", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    // Use ref for guaranteed latest values (immune to React batching/stale closure)
    const f = formRef.current;
    const payload = {
      name: f.name,
      slug: f.slug || undefined,
      description: f.description || undefined,
      price: parseNum(f.price),
      original_price: f.original_price ? parseNum(f.original_price) : null,
      stock: parseNum(f.stock),
      category_id: f.category_id ? Number(f.category_id) : null,
      brand_id: f.brand_id ? Number(f.brand_id) : null,
      image: f.image || undefined,
      badge: f.badge || undefined,
      weight: f.weight || undefined,
      is_active: f.is_active,
      is_featured: f.is_featured,
    };
    try {
      if (editId) {
        const res = await api.admin.updateProduct(editId, payload);
        const updated = res.data || res;
        setProducts((prev) => prev.map((p) => (p.id === editId ? { ...p, ...updated } : p)));
        showToast("পণ্য আপডেট হয়েছে!");
      } else {
        const res = await api.admin.createProduct(payload);
        const created = res.data || res;
        setProducts((prev) => [created, ...prev]);
        showToast("নতুন পণ্য তৈরি হয়েছে!");
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const error = err as { message?: string; errors?: Record<string, string[]> };
      if (error.errors) {
        showToast(Object.values(error.errors).flat().join(", "), "error");
      } else {
        showToast(error.message || "সমস্যা হয়েছে, আবার চেষ্টা করুন", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.admin.deleteProduct(deleteId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      showToast("পণ্য মুছে ফেলা হয়েছে!");
      setDeleteId(null);
    } catch {
      showToast("মুছতে সমস্যা হয়েছে", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0f5931] focus:outline-none";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <DashboardLayout title="পণ্য">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message="এই পণ্যটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="পণ্য খুঁজুন..."
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
            নতুন পণ্য
          </button>
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
                    {["ছবি", "নাম", "ক্যাটাগরি", "দাম", "স্টক", "বিক্রি", "স্ট্যাটাস", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">কোনো পণ্য পাওয়া যায়নি</td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveImg(p.image || "/placeholder.png")} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <FiImage className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 max-w-44 truncate">{p.name}</div>
                          {p.badge && <span className="text-xs text-[#0f5931] font-medium">{p.badge}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.category?.name || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-[#0f5931] whitespace-nowrap">৳{toBn(p.price)}</td>
                        <td className="px-4 py-3 text-gray-600">{toBn(p.stock)}</td>
                        <td className="px-4 py-3 text-gray-600">{toBn(p.sold ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {p.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onMouseDown={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-800">{editId ? "পণ্য সম্পাদনা" : "নতুন পণ্য"}</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>নাম *</label>
                    <input name="name" required value={form.name} onChange={(e) => handleNameChange(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>স্লাগ *</label>
                    <input name="slug" required value={form.slug} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, slug: v })); }} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ক্যাটাগরি</label>
                    <select name="category_id" value={form.category_id} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, category_id: v })); }} className={inputCls}>
                      <option value="">নির্বাচন করুন</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>ব্র্যান্ড</label>
                    <select name="brand_id" value={form.brand_id} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, brand_id: v })); }} className={inputCls}>
                      <option value="">নির্বাচন করুন</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>দাম (৳) *</label>
                    <input name="price" required type="text" inputMode="decimal" value={form.price} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, price: v })); }} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelCls}>আসল দাম (৳)</label>
                    <input name="original_price" type="text" inputMode="decimal" value={form.original_price} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, original_price: v })); }} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelCls}>স্টক *</label>
                    <input name="stock" required type="text" inputMode="numeric" value={form.stock} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, stock: v })); }} className={inputCls} placeholder="0" />
                  </div>
                  <div className="relative">
                    <label className={labelCls}>ব্যাজ</label>
                    <input
                      name="badge"
                      value={form.badge}
                      onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, badge: v })); setBadgeOpen(true); }}
                      onFocus={() => setBadgeOpen(true)}
                      onBlur={() => setTimeout(() => setBadgeOpen(false), 150)}
                      className={inputCls}
                      placeholder="যেমন: নতুন, জনপ্রিয়"
                      autoComplete="off"
                    />
                    {badgeOpen && (() => {
                      const allBadges = [...new Set(products.map((p) => p.badge).filter(Boolean) as string[])];
                      const filtered = form.badge
                        ? allBadges.filter((b) => b.toLowerCase().includes(form.badge.toLowerCase()))
                        : allBadges;
                      if (filtered.length === 0 && form.badge.trim()) {
                        return (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-2">
                            <div className="px-3 py-2 text-xs text-text-muted">
                              &quot;{form.badge}&quot; নতুন ব্যাজ হিসেবে তৈরি হবে
                            </div>
                          </div>
                        );
                      }
                      if (filtered.length === 0) return null;
                      return (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-36 overflow-y-auto">
                          {filtered.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setForm(prev => ({ ...prev, badge: b })); setBadgeOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 hover:text-primary transition-colors"
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <label className={labelCls}>ওজন</label>
                    <input name="weight" value={form.weight} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, weight: v })); }} className={inputCls} placeholder="যেমন: ১০০গ্রাম" />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className={labelCls}>পণ্যের ছবি</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl transition-colors ${dragOver ? "border-[#0f5931] bg-green-50/50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    {form.image ? (
                      <div className="p-3 flex items-center gap-4">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolveImg(form.image)} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 font-medium truncate">{form.image.split("/").pop()}</p>
                          <p className="text-xs text-gray-400 mt-0.5">ক্লিক করুন বা ড্র্যাগ করুন পরিবর্তন করতে</p>
                          <div className="flex gap-2 mt-2">
                            <label className="cursor-pointer px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors">
                              পরিবর্তন করুন
                              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                            </label>
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, image: "" }))}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-medium text-red-600 transition-colors"
                            >
                              মুছুন
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2 py-8 px-4">
                        {uploading ? (
                          <div className="w-8 h-8 border-3 border-[#0f5931] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                            <FiUploadCloud className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-[#0f5931]">ক্লিক করুন</span> অথবা ছবি এখানে ড্র্যাগ করুন
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (সর্বোচ্চ ৫MB)</p>
                        </div>
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>বিবরণ</label>
                  <textarea name="description" rows={3} value={form.description} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, description: v })); }} className={inputCls + " resize-none"} />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input name="is_active" type="checkbox" checked={form.is_active} onChange={(e) => { const v = e.target.checked; setForm(prev => ({ ...prev, is_active: v })); }} className="w-4 h-4 accent-[#0f5931]" />
                    সক্রিয়
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input name="is_featured" type="checkbox" checked={form.is_featured} onChange={(e) => { const v = e.target.checked; setForm(prev => ({ ...prev, is_featured: v })); }} className="w-4 h-4 accent-[#0f5931]" />
                    ফিচার্ড
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    বাতিল
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50">
                    {saving ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট করুন" : "তৈরি করুন"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

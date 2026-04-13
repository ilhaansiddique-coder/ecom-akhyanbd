"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toBn, parseNum } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import Toast from "@/components/Toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiImage, FiUploadCloud, FiEye, FiCopy,
  FiBox, FiCheckCircle, FiXCircle, FiTrendingUp,
} from "react-icons/fi";
import { useChannel } from "@/lib/useChannel";
import { useAutoSlug } from "@/lib/useAutoSlug";
import { useLang } from "@/lib/LanguageContext";
import { TableSkeleton } from "@/components/DashboardSkeleton";
import { theme } from "@/lib/theme";
import InlineSelect from "@/components/InlineSelect";
import { SafeImg } from "@/components/SafeImage";
import MediaGallery from "@/components/MediaGallery";

const API_BASE = "";
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
  sold_count?: number;
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
  unlimited_stock: false,
  is_active: true,
  is_featured: false,
  has_variations: false,
  variation_type: "",
  variants: [] as { label: string; price: string; original_price: string; sku: string; stock: string; unlimited_stock: boolean; image: string; is_active: boolean }[],
};

type FormState = typeof emptyForm;

// slugify removed — now using useAutoSlug hook with backend transliteration

export default function ProductsPage() {
  const { t, lang } = useLang();
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<string>("product"); // "product" or "variant-{idx}"

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
      .catch(() => { if (!background) showToast(t("toast.loadError"), "error"); })
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

  const duplicateProduct = (p: Product) => {
    setEditId(null); // Create mode, not edit
    setForm({
      name: p.name + " (Copy)",
      slug: p.slug + "-copy",
      category_id: String(p.category?.id || p.category_id || ""),
      brand_id: String(p.brand?.id || p.brand_id || ""),
      description: p.description || "",
      price: String(p.price),
      original_price: p.original_price != null ? String(p.original_price) : "",
      image: p.image || "",
      badge: p.badge || "",
      weight: p.weight || "",
      stock: String(p.stock),
      unlimited_stock: (p as any).unlimited_stock ?? false,
      is_active: false, // Duplicates start as inactive
      is_featured: false,
      has_variations: (p as any).has_variations || false,
      variation_type: (p as any).variation_type || "",
      variants: ((p as any).variants || []).map((v: any) => ({
        label: v.label || "", price: String(v.price), original_price: v.original_price != null ? String(v.original_price) : "",
        sku: "", stock: String(v.stock || 0), unlimited_stock: Boolean(v.unlimited_stock),
        image: v.image || "", is_active: v.is_active !== false,
      })),
    });
    setModalOpen(true);
    showToast(lang === "en" ? "Product duplicated — edit and save" : "পণ্য ডুপ্লিকেট হয়েছে — সম্পাদনা করে সংরক্ষণ করুন");
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
      unlimited_stock: (p as any).unlimited_stock ?? false,
      is_active: p.is_active,
      is_featured: p.is_featured,
      has_variations: (p as any).has_variations || (p as any).hasVariations || false,
      variation_type: (p as any).variation_type || (p as any).variationType || "",
      variants: ((p as any).variants || []).map((v: any) => ({
        label: v.label || "", price: String(v.price), original_price: v.original_price != null ? String(v.original_price) : "",
        sku: v.sku || "", stock: String(v.stock || 0), unlimited_stock: Boolean(v.unlimited_stock || v.unlimitedStock),
        image: v.image || "", is_active: v.is_active !== false,
      })),
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
      showToast(t("toast.imageError"), "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t("toast.imageError"), "error");
      return;
    }
    setUploading(true);
    try {
      const res = await api.admin.upload(file);
      setForm((prev) => ({ ...prev, image: res.url || res.path }));
      showToast(t("toast.imageUploaded"));
    } catch {
      showToast(t("toast.imageError"), "error");
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
      unlimited_stock: f.unlimited_stock,
      category_id: f.category_id ? Number(f.category_id) : null,
      brand_id: f.brand_id ? Number(f.brand_id) : null,
      image: f.image || undefined,
      badge: f.badge || undefined,
      weight: f.weight || undefined,
      is_active: f.is_active,
      is_featured: f.is_featured,
      has_variations: f.has_variations,
      variation_type: f.variation_type || undefined,
      variants: f.has_variations ? f.variants.map((v, i) => ({
        label: v.label, price: parseNum(v.price), original_price: v.original_price ? parseNum(v.original_price) : null,
        sku: v.sku || null, stock: parseNum(v.stock), unlimited_stock: v.unlimited_stock,
        image: v.image || null, sort_order: i, is_active: v.is_active,
      })) : [],
    };
    try {
      if (editId) {
        const res = await api.admin.updateProduct(editId, payload);
        const updated = res.data || res;
        setProducts((prev) => prev.map((p) => (p.id === editId ? { ...p, ...updated } : p)));
        showToast(t("toast.updated"));
      } else {
        const res = await api.admin.createProduct(payload);
        const created = res.data || res;
        setProducts((prev) => [created, ...prev]);
        showToast(t("toast.created"));
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const error = err as { message?: string; errors?: Record<string, string[]> };
      if (error.errors) {
        showToast(Object.values(error.errors).flat().join(", "), "error");
      } else {
        showToast(error.message || t("toast.error"), "error");
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
      showToast(t("toast.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("common.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("dash.products")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message={t("confirm.deleteProduct")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      {/* Product Stats Cards */}
      {!loading && products.length > 0 && (() => {
        const total = products.length;
        const inStock = products.filter(p => (p as any).unlimited_stock || p.stock > 0).length;
        const outOfStock = products.filter(p => !(p as any).unlimited_stock && p.stock <= 0).length;
        const getStockValue = (p: Product) => (p as any).unlimited_stock ? 0 : p.price * p.stock;
        const totalValue = products.reduce((s, p) => s + getStockValue(p), 0);
        const inStockValue = products.filter(p => (p as any).unlimited_stock || p.stock > 0).reduce((s, p) => s + getStockValue(p), 0);
        const getSold = (p: Product) => p.sold_count ?? p.sold ?? 0;
        const best = [...products].sort((a, b) => getSold(b) - getSold(a))[0];
        const bestSold = best ? getSold(best) : 0;
        const bestRevenue = bestSold * (best?.price || 0);

        const cards = [
          { icon: FiBox, label: t("dash.productCount"), value: toBn(total), sub: `৳${toBn(totalValue)}`, color: "bg-[#0f5931]" },
          { icon: FiCheckCircle, label: lang === "en" ? "In Stock" : "স্টকে আছে", value: toBn(inStock), sub: `৳${toBn(inStockValue)}`, color: "bg-emerald-500" },
          { icon: FiXCircle, label: lang === "en" ? "Out of Stock" : "স্টক শেষ", value: toBn(outOfStock), sub: lang === "en" ? "Needs restock" : "রিস্টক দরকার", color: "bg-red-500" },
          { icon: FiTrendingUp, label: lang === "en" ? "Best Seller" : "সেরা বিক্রিত", value: bestSold > 0 ? (best?.name || "-") : (lang === "en" ? "No sales yet" : "এখনো বিক্রি হয়নি"), sub: bestSold > 0 ? `${toBn(bestSold)} ${lang === "en" ? "sold" : "বিক্রি"} • ৳${toBn(bestRevenue)}` : (lang === "en" ? "Sales will appear here" : "বিক্রি হলে দেখাবে"), color: "bg-violet-500", truncate: true },
        ];

        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            {cards.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
                  <c.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className={`text-lg md:text-xl font-bold text-gray-800 ${c.truncate ? "truncate" : ""}`}>{c.value}</div>
                  <div className="text-[11px] md:text-xs text-gray-500 truncate">{c.label}</div>
                  <div className="text-[11px] md:text-xs font-semibold text-[#0f5931] truncate">{c.sub}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        );
      })()}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("search.products")}
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
            {t("btn.addProduct")}
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
                    {[t("th.image"), t("th.name"), t("th.category"), t("th.price"), t("th.stock"), t("th.sales"), t("th.status"), t("th.actions")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">{t("empty.products")}</td>
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
                            <SafeImg src={resolveImg(p.image || "/placeholder.svg")} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
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
                        <td className="px-4 py-3 text-gray-600">{(p as any).unlimited_stock ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{lang === "en" ? "Unlimited" : "আনলিমিটেড"}</span> : toBn(p.stock)}</td>
                        <td className="px-4 py-3 text-gray-600">{toBn((p as any).sold_count ?? p.sold ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {p.is_active ? t("form.active") : t("form.inactive")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="পণ্য দেখুন">
                              <FiEye className="w-3.5 h-3.5" />
                            </a>
                            <button onClick={() => openEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="সম্পাদনা">
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => duplicateProduct(p)} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="ডুপ্লিকেট">
                              <FiCopy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="মুছুন">
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("modal.editProduct") : t("modal.newProduct")} size="xl" persistent>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t("form.name")} *</label>
                    <input name="name" required value={form.name} onChange={(e) => handleNameChange(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("form.slug")} *</label>
                    <input name="slug" required value={form.slug} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, slug: v })); }} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("form.category")}</label>
                    <InlineSelect fullWidth value={form.category_id} options={[{ value: "", label: t("form.select") }, ...categories.map(c => ({ value: String(c.id), label: c.name }))]} onChange={(v) => { setForm(prev => ({ ...prev, category_id: v })); }} placeholder={t("form.select")} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("form.brand")}</label>
                    <InlineSelect fullWidth value={form.brand_id} options={[{ value: "", label: t("form.select") }, ...brands.map(b => ({ value: String(b.id), label: b.name }))]} onChange={(v) => { setForm(prev => ({ ...prev, brand_id: v })); }} placeholder={t("form.select")} />
                  </div>
                  {/* Row: Price | Original Price | Stock — 33% each */}
                  <div className="grid grid-cols-3 gap-3 col-span-2">
                    <div>
                      <label className={labelCls}>{t("form.price")} *</label>
                      <input name="price" required type="number" min="0" step="0.01" value={form.price} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, price: v })); }} className={inputCls} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelCls}>{t("form.originalPrice")}</label>
                      <input name="original_price" type="number" min="0" step="0.01" value={form.original_price} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, original_price: v })); }} className={inputCls} placeholder="0" />
                    </div>
                    <div>
                      <label className={labelCls}>{t("form.stock")}</label>
                      <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, stock: v })); }}
                        className={inputCls + (form.unlimited_stock ? " opacity-50" : "")} placeholder="0"
                        disabled={form.unlimited_stock} />
                    </div>
                  </div>
                  {/* Row: Unlimited toggle | Badge | Weight — 33% each */}
                  <div className="grid grid-cols-3 gap-3 col-span-2">
                    <div>
                      <label className={labelCls}>&nbsp;</label>
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, unlimited_stock: !prev.unlimited_stock }))}
                        className={`w-full h-[42px] flex items-center justify-between gap-2 px-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                          form.unlimited_stock ? "border-[#0f5931] bg-[#0f5931]/5 text-[#0f5931]" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}>
                        <span>{lang === "en" ? "Unlimited" : "আনলিমিটেড"}</span>
                        <div className={`relative w-8 h-[18px] rounded-full transition-colors ${form.unlimited_stock ? "bg-[#0f5931]" : "bg-gray-300"}`}>
                          <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${form.unlimited_stock ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
                        </div>
                      </button>
                    </div>
                    <div className="relative">
                      <label className={labelCls}>{t("form.badge")}</label>
                      <input name="badge" value={form.badge}
                        onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, badge: v })); setBadgeOpen(true); }}
                        onFocus={() => setBadgeOpen(true)}
                        onBlur={() => setTimeout(() => setBadgeOpen(false), 150)}
                        className={inputCls} placeholder="যেমন: নতুন, জনপ্রিয়" autoComplete="off" />
                      {badgeOpen && (() => {
                        const allBadges = [...new Set(products.map((p) => p.badge).filter(Boolean) as string[])];
                        const filtered = form.badge ? allBadges.filter((b) => b.toLowerCase().includes(form.badge.toLowerCase())) : allBadges;
                        if (filtered.length === 0 && form.badge.trim()) return (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-2">
                            <div className="px-3 py-2 text-xs text-text-muted">&quot;{form.badge}&quot; নতুন ব্যাজ হিসেবে তৈরি হবে</div>
                          </div>
                        );
                        if (filtered.length === 0) return null;
                        return (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-36 overflow-y-auto">
                            {filtered.map((b) => (
                              <button key={b} type="button" onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setForm(prev => ({ ...prev, badge: b })); setBadgeOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 hover:text-primary transition-colors">{b}</button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className={labelCls}>{t("form.weight")}</label>
                      <input name="weight" value={form.weight} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, weight: v })); }} className={inputCls} placeholder="যেমন: ১০০গ্রাম" />
                    </div>
                  </div>
                </div>

                {/* Description (80%) + Image (20%) in one row */}
                <div className="flex gap-4 col-span-2">
                  <div className="flex-[4] flex flex-col">
                    <label className={labelCls}>{t("form.description")}</label>
                    <textarea name="description" value={form.description} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, description: v })); }} className={inputCls + " resize-none flex-1 min-h-[120px]"} />
                  </div>
                  <div className="flex-[1]"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}>
                    <label className={labelCls}>{t("form.image")}</label>
                    <div className={`border-2 border-dashed rounded-xl transition-colors cursor-pointer ${dragOver ? "border-[#0f5931] bg-green-50/50" : "border-gray-200 hover:border-gray-300"}`}
                      onClick={() => { if (!form.image) { setGalleryTarget("product"); setGalleryOpen(true); } }}>
                      {form.image ? (
                        <div className="p-2">
                          <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-100">
                            <SafeImg src={resolveImg(form.image)} alt="Preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={(e) => { e.stopPropagation(); setForm((prev) => ({ ...prev, image: "" })); }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm">
                              <FiX className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 px-2 flex flex-col items-center gap-2">
                          {uploading ? (
                            <div className="w-6 h-6 border-2 border-[#0f5931] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <FiUploadCloud className="w-8 h-8 text-gray-300" />
                          )}
                          <p className="text-[10px] text-gray-400 text-center">Click to browse</p>
                        </div>
                      )}
                    </div>
                    {form.image && (
                      <button type="button" onClick={() => { setGalleryTarget("product"); setGalleryOpen(true); }}
                        className="w-full py-1.5 mt-2 bg-[#0f5931] hover:bg-[#12693a] rounded-lg text-[10px] font-medium text-white transition-colors flex items-center justify-center gap-1">
                        <FiImage className="w-3 h-3" /> {lang === "en" ? "Change" : "পরিবর্তন"}
                      </button>
                    )}
                  </div>
                </div>
                {/* Has Variations — full width row */}
                <div className="col-span-2">
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, has_variations: !prev.has_variations }))}
                    className={`w-full h-[42px] flex items-center justify-between gap-2 px-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                      form.has_variations ? "border-[#0f5931] bg-[#0f5931]/5 text-[#0f5931]" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}>
                    <span>{lang === "en" ? "Has Variations" : "ভ্যারিয়েশন আছে"}</span>
                    <div className={`relative w-9 h-5 rounded-full transition-colors ${form.has_variations ? "bg-[#0f5931]" : "bg-gray-300"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.has_variations ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                  </button>
                </div>
                {/* Variations Detail (shown when toggle is on) */}
                {form.has_variations && (
                  <div className="border border-[#0f5931]/20 bg-[#0f5931]/[0.02] rounded-xl p-4 space-y-3">
                    <input value={form.variation_type} onChange={(e) => setForm(prev => ({ ...prev, variation_type: e.target.value }))}
                      className={inputCls} placeholder={lang === "en" ? "Variation type (e.g. Weight, Size, Color)" : "ভ্যারিয়েশন টাইপ (যেমন: ওজন, সাইজ, রং)"} />
                    {form.variants.map((v, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-3 space-y-2 border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-6">{idx + 1}</span>
                          <input value={v.label} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], label: e.target.value }; setForm(prev => ({ ...prev, variants })); }}
                            className={inputCls + " flex-1"} placeholder={lang === "en" ? "Label (e.g. 400g)" : "লেবেল (যেমন: ৪০০ গ্রাম)"} />
                          <button type="button" onClick={() => { const variants = form.variants.filter((_, i) => i !== idx); setForm(prev => ({ ...prev, variants })); }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiX className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_1fr_42px] gap-2">
                          <div>
                            <label className="text-[10px] text-gray-400">{lang === "en" ? "Price" : "দাম"} *</label>
                            <input type="number" min="0" value={v.price} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], price: e.target.value }; setForm(prev => ({ ...prev, variants })); }}
                              className={inputCls} placeholder="0" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400">{lang === "en" ? "Original Price" : "আসল দাম"}</label>
                            <input type="number" min="0" value={v.original_price} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], original_price: e.target.value }; setForm(prev => ({ ...prev, variants })); }}
                              className={inputCls} placeholder="0" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400">{lang === "en" ? "Stock" : "স্টক"}</label>
                            <input type="number" min="0" value={v.stock} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], stock: e.target.value }; setForm(prev => ({ ...prev, variants })); }}
                              className={inputCls} placeholder="0" disabled={v.unlimited_stock} />
                          </div>
                          <div className="flex items-end pb-0.5">
                            {v.image ? (
                              <div className="relative w-10 h-10 shrink-0">
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
                                  <SafeImg src={v.image} alt="" className="w-full h-full object-cover" />
                                </div>
                                <button type="button" onClick={() => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], image: "" }; setForm(prev => ({ ...prev, variants })); }}
                                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full z-10 shadow-sm"><FiX className="w-2.5 h-2.5" /></button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => { setGalleryTarget(`variant-${idx}`); setGalleryOpen(true); }}
                                className="w-10 h-10 rounded-lg border border-dashed border-gray-300 flex items-center justify-center hover:border-[#0f5931] transition-colors shrink-0" title={lang === "en" ? "Add image" : "ছবি যোগ করুন"}>
                                <FiImage className="w-4 h-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={v.unlimited_stock} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], unlimited_stock: e.target.checked }; setForm(prev => ({ ...prev, variants })); }}
                              className="w-3.5 h-3.5 accent-[#0f5931]" />
                            {lang === "en" ? "Unlimited" : "আনলিমিটেড"}
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={v.is_active} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], is_active: e.target.checked }; setForm(prev => ({ ...prev, variants })); }}
                              className="w-3.5 h-3.5 accent-[#0f5931]" />
                            {lang === "en" ? "Active" : "সক্রিয়"}
                          </label>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, variants: [...prev.variants, { label: "", price: "", original_price: "", sku: "", stock: "0", unlimited_stock: true, image: "", is_active: true }] }))}
                      className="flex items-center gap-1 text-xs font-medium text-[#0f5931] hover:underline">
                      <FiPlus className="w-3.5 h-3.5" /> {lang === "en" ? "Add Variant" : "ভ্যারিয়েন্ট যোগ করুন"}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input name="is_active" type="checkbox" checked={form.is_active} onChange={(e) => { const v = e.target.checked; setForm(prev => ({ ...prev, is_active: v })); }} className="w-4 h-4 accent-[#0f5931]" />
                    {t("form.active")}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input name="is_featured" type="checkbox" checked={form.is_featured} onChange={(e) => { const v = e.target.checked; setForm(prev => ({ ...prev, is_featured: v })); }} className="w-4 h-4 accent-[#0f5931]" />
                    {t("form.featured")}
                  </label>
                </div>
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

      <MediaGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => {
          if (galleryTarget === "product") {
            setForm((prev) => ({ ...prev, image: url }));
          } else if (galleryTarget.startsWith("variant-")) {
            const idx = Number(galleryTarget.split("-")[1]);
            if (!isNaN(idx) && idx >= 0 && idx < form.variants.length) {
              const variants = [...form.variants];
              variants[idx] = { ...variants[idx], image: url };
              setForm((prev) => ({ ...prev, variants }));
            }
          }
        }}
      />
    </DashboardLayout>
  );
}

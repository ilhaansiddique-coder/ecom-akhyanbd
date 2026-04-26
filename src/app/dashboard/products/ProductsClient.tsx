"use client";

// ─── ProductsClient ───────────────────────────────────────────────────────────
// Receives ALL products pre-fetched from the server component (page.tsx).
// Search and pagination are done in-memory — instant, zero network requests.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toBn, parseNum } from "@/utils/toBn";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import Toast from "@/components/Toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiImage, FiUploadCloud, FiEye, FiCopy,
} from "react-icons/fi";
import { useChannel } from "@/lib/useChannel";
import { useAutoSlug } from "@/lib/useAutoSlug";
import { useLang } from "@/lib/LanguageContext";
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

interface InitialData {
  products: Product[];
  total?: number;
  categories: Category[];
  brands: Brand[];
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
  // Additional product images shown alongside `image` in the PDP gallery.
  // Stored as JSON-stringified array in DB; empty until admin adds them.
  images: [] as string[],
  badge: "",
  weight: "",
  stock: "",
  unlimited_stock: false,
  is_active: true,
  is_featured: false,
  custom_shipping: false,
  shipping_cost: "",
  has_variations: false,
  variation_type: "",
  variants: [] as { label: string; price: string; original_price: string; sku: string; stock: string; unlimited_stock: boolean; image: string; is_active: boolean }[],
};

type FormState = typeof emptyForm;

/**
 * Product.images is a `String?` column holding a JSON-stringified array of
 * image URLs (e.g. `["uploads/a.webp","uploads/b.webp"]`). The admin list
 * endpoint passes it through unchanged. Parse defensively — accept both
 * already-parsed arrays (forward-compatible) and JSON strings.
 */
function parseProductImages(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === "string" && !!u.trim());
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && !!u.trim());
      }
    } catch {}
  }
  return [];
}

// slugify removed — now using useAutoSlug hook with backend transliteration

export default function ProductsClient({ initialData }: { initialData?: InitialData }) {
  const { t, lang } = useLang();
  // allProducts holds the full list — never filtered, updated after mutations
  const [allProducts, setAllProducts] = useState<Product[]>(initialData?.products ?? []);
  const [categories] = useState<Category[]>(initialData?.categories ?? []);
  const [brands] = useState<Brand[]>(initialData?.brands ?? []);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  // In-memory search — instant, zero network
  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.category?.name || "").toLowerCase().includes(q) ||
      (p.badge || "").toLowerCase().includes(q)
    );
  }, [allProducts, searchInput]);

  // Reset to page 1 whenever search changes
  useEffect(() => { setPage(1); }, [searchInput]);

  // Paginated slice — instant
  const products = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page]
  );
  const totalProducts = filtered.length;

  // Hover preview tooltip + click-to-zoom modal for product list images
  const [hoverPreview, setHoverPreview] = useState<{ image: string; x: number; y: number } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Bulk selection — same pattern as orders page
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);
  const toggleSelectProduct = (id: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  // Bulk-apply inputs for the variants panel. Kept outside `form` so the
  // main payload isn't polluted with transient UI-only values.
  const [bulk, setBulk] = useState<{ price: string; original_price: string; stock: string }>({ price: "", original_price: "", stock: "" });
  const formRef = useRef<FormState>(emptyForm);
  // Keep ref in sync with state — ref is always latest, never stale
  formRef.current = form;
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Trash view — when on, list shows soft-deleted products and Delete becomes permanent
  const [trashView, setTrashView] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<string>("product"); // "product" or "variant-{idx}"

  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  // Background sync — silently refresh the full product list after remote changes
  const refreshAllProducts = useCallback(() => {
    const params = new URLSearchParams({ page: "1", per_page: "500" });
    if (trashView) params.set("trash", "1");
    api.admin.getProducts(params.toString())
      .then((res: any) => {
        const list = res.data || res || [];
        // Allow empty list when in trash view (means trash is empty)
        if (Array.isArray(list)) setAllProducts(list);
      })
      .catch(() => {/* silent */});
  }, [trashView]);

  // Reload when toggling trash view
  useEffect(() => {
    setTrashLoading(true);
    const params = new URLSearchParams({ page: "1", per_page: "500" });
    if (trashView) params.set("trash", "1");
    api.admin.getProducts(params.toString())
      .then((res: any) => {
        const list = res.data || res || [];
        if (Array.isArray(list)) setAllProducts(list);
      })
      .catch(() => {})
      .finally(() => setTrashLoading(false));
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashView]);

  // Real-time: background sync when any product is created/updated/deleted remotely
  useChannel("products", ".product.changed", refreshAllProducts);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setBulk({ price: "", original_price: "", stock: "" });
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
      images: parseProductImages((p as any).images),
      badge: p.badge || "",
      weight: p.weight || "",
      stock: String(p.stock),
      unlimited_stock: Boolean((p as any).unlimited_stock ?? false),
      is_active: false, // Duplicates start as inactive
      is_featured: false,
      custom_shipping: Boolean((p as any).custom_shipping || (p as any).customShipping || false),
      shipping_cost: (p as any).shipping_cost != null ? String((p as any).shipping_cost) : ((p as any).shippingCost != null ? String((p as any).shippingCost) : ""),
      has_variations: (p as any).has_variations || (p as any).hasVariations || false,
      variation_type: (p as any).variation_type || "",
      variants: ((p as any).variants || []).map((v: any) => ({
        label: v.label || "", price: String(v.price), original_price: v.original_price != null ? String(v.original_price) : "",
        sku: "", stock: String(v.stock || 0), unlimited_stock: Boolean(v.unlimited_stock),
        image: v.image || "", is_active: v.is_active !== false,
      })),
    });
    setBulk({ price: "", original_price: "", stock: "" });
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
      images: parseProductImages((p as any).images),
      badge: p.badge || "",
      weight: p.weight || "",
      stock: String(p.stock),
      unlimited_stock: (p as any).unlimited_stock ?? false,
      is_active: p.is_active,
      is_featured: p.is_featured,
      custom_shipping: (p as any).custom_shipping || (p as any).customShipping || false,
      shipping_cost: (p as any).shipping_cost != null ? String((p as any).shipping_cost) : ((p as any).shippingCost != null ? String((p as any).shippingCost) : ""),
      has_variations: (p as any).has_variations || (p as any).hasVariations || false,
      variation_type: (p as any).variation_type || (p as any).variationType || "",
      variants: ((p as any).variants || []).map((v: any) => ({
        label: v.label || "", price: String(v.price), original_price: v.original_price != null ? String(v.original_price) : "",
        sku: v.sku || "", stock: String(v.stock || 0), unlimited_stock: Boolean(v.unlimited_stock || v.unlimitedStock),
        image: v.image || "", is_active: v.is_active !== false,
      })),
    });
    setBulk({ price: "", original_price: "", stock: "" });
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
    // Use ref for guaranteed latest values (immune to React batching/stale closure)
    const f = formRef.current;
    const payload = {
      name: f.name,
      slug: f.slug || undefined,
      description: f.description || undefined,
      price: parseNum(f.price),
      original_price: f.original_price ? parseNum(f.original_price) : null,
      stock: f.has_variations ? f.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0) : parseNum(f.stock),
      unlimited_stock: f.unlimited_stock,
      category_id: f.category_id ? Number(f.category_id) : null,
      brand_id: f.brand_id ? Number(f.brand_id) : null,
      image: f.image || undefined,
      // Filter out empties so the DB never gets `[""]`. The server JSON-
      // stringifies on its end (admin/products/route.ts).
      images: (f.images || []).filter((u) => !!(u && u.trim())),
      badge: f.badge || undefined,
      weight: f.weight || undefined,
      is_active: f.is_active,
      is_featured: f.is_featured,
      custom_shipping: f.custom_shipping,
      shipping_cost: f.custom_shipping && f.shipping_cost ? parseNum(f.shipping_cost) : null,
      has_variations: f.has_variations,
      variation_type: f.variation_type || undefined,
      variants: f.has_variations ? f.variants.map((v, i) => ({
        label: v.label, price: parseNum(v.price), original_price: v.original_price ? parseNum(v.original_price) : null,
        sku: v.sku || null, stock: parseNum(v.stock), unlimited_stock: v.unlimited_stock,
        image: v.image || null, sort_order: i, is_active: v.is_active,
      })) : [],
    };

    // ── OPTIMISTIC UPDATE ──
    // Close modal + patch list instantly. Server sync happens in the background.
    // On error, revert + surface toast.
    const isEdit = editId != null;
    const prevSnapshot = allProducts;
    const optimisticVariants = payload.variants.map((v, i) => ({
      id: -(i + 1), // negative temp id
      label: v.label,
      price: v.price,
      original_price: v.original_price,
      sku: v.sku,
      stock: v.stock,
      unlimited_stock: v.unlimited_stock,
      image: v.image,
      sort_order: v.sort_order,
      is_active: v.is_active,
    }));
    const optimisticProduct: any = {
      id: isEdit ? editId : -Date.now(), // temp negative id for create
      name: payload.name,
      slug: payload.slug || "",
      price: payload.price,
      original_price: payload.original_price,
      image: payload.image,
      badge: payload.badge,
      weight: payload.weight,
      stock: payload.stock,
      unlimited_stock: payload.unlimited_stock,
      is_active: payload.is_active,
      is_featured: payload.is_featured,
      has_variations: payload.has_variations,
      hasVariations: payload.has_variations,
      custom_shipping: payload.custom_shipping,
      shipping_cost: payload.shipping_cost,
      description: payload.description,
      category: payload.category_id ? categories.find((c) => c.id === payload.category_id) : undefined,
      brand: payload.brand_id ? brands.find((b) => b.id === payload.brand_id) : undefined,
      category_id: payload.category_id,
      brand_id: payload.brand_id,
      variants: optimisticVariants,
    };

    if (isEdit) {
      setAllProducts((prev) => prev.map((p) => (p.id === editId ? { ...p, ...optimisticProduct } : p)));
    } else {
      setAllProducts((prev) => [optimisticProduct, ...prev]);
    }
    setModalOpen(false);
    showToast(isEdit ? t("toast.updated") : t("toast.created"));

    // Background sync — replace optimistic row with server's authoritative copy
    try {
      const res = isEdit
        ? await api.admin.updateProduct(editId!, payload)
        : await api.admin.createProduct(payload);
      const saved = res.data || res;
      setAllProducts((prev) =>
        prev.map((p) => (p.id === optimisticProduct.id ? { ...p, ...saved } : p))
      );
    } catch (err: unknown) {
      // Revert
      setAllProducts(prevSnapshot);
      const error = err as { message?: string; errors?: Record<string, string[]> };
      if (error.errors) {
        showToast(Object.values(error.errors).flat().join(", "), "error");
      } else {
        showToast(error.message || t("toast.error"), "error");
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      // In trash view → permanent delete; otherwise soft (move to trash).
      await api.admin.deleteProduct(deleteId, trashView);
      setAllProducts((prev) => prev.filter((p) => p.id !== deleteId));
      showToast(trashView
        ? (lang === "en" ? "Permanently deleted" : "স্থায়ীভাবে মুছে ফেলা হয়েছে")
        : (lang === "en" ? "Moved to trash" : "ট্র্যাশে পাঠানো হয়েছে"));
      setDeleteId(null);
    } catch (err) {
      const msg = (err as { message?: string })?.message;
      showToast(msg || t("common.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.admin.restoreProduct(id);
      setAllProducts((prev) => prev.filter((p) => p.id !== id));
      showToast(lang === "en" ? "Restored" : "পুনরুদ্ধার হয়েছে");
    } catch {
      showToast(lang === "en" ? "Restore failed" : "পুনরুদ্ধার ব্যর্থ", "error");
    }
  };

  // Select / deselect every visible product on the current page
  const toggleSelectAll = () => {
    if (selectedProducts.size >= products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  // Bulk: trash (or permanent delete when in trash view) every selected product
  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    const count = selectedProducts.size;
    const confirmMsg = trashView
      ? (lang === "en" ? `Permanently delete ${count} products?` : `${count}টি পণ্য স্থায়ীভাবে মুছবেন?`)
      : (lang === "en" ? `Move ${count} products to trash?` : `${count}টি পণ্য ট্র্যাশে পাঠাবেন?`);
    if (!confirm(confirmMsg)) return;
    setBulkActing(true);
    try {
      const ids = Array.from(selectedProducts);
      await Promise.all(ids.map((id) => api.admin.deleteProduct(id, trashView)));
      setAllProducts((prev) => prev.filter((p) => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      showToast(trashView
        ? (lang === "en" ? `${count} permanently deleted` : `${count}টি স্থায়ীভাবে মুছে ফেলা হয়েছে`)
        : (lang === "en" ? `${count} moved to trash` : `${count}টি ট্র্যাশে পাঠানো হয়েছে`));
    } catch {
      showToast(t("common.deleteError"), "error");
    } finally {
      setBulkActing(false);
    }
  };

  // Bulk activate / deactivate — flips isActive on every selected product
  const handleBulkSetActive = async (active: boolean) => {
    if (selectedProducts.size === 0) return;
    setBulkActing(true);
    try {
      const ids = Array.from(selectedProducts);
      await Promise.all(ids.map((id) => api.admin.updateProduct(id, { is_active: active })));
      setAllProducts((prev) => prev.map((p) => (selectedProducts.has(p.id) ? { ...p, is_active: active } : p)));
      setSelectedProducts(new Set());
      showToast(
        active
          ? (lang === "en" ? `${ids.length} activated` : `${ids.length}টি সক্রিয় হয়েছে`)
          : (lang === "en" ? `${ids.length} deactivated` : `${ids.length}টি নিষ্ক্রিয় হয়েছে`)
      );
    } catch {
      showToast(lang === "en" ? "Bulk update failed" : "বাল্ক আপডেট ব্যর্থ", "error");
    } finally {
      setBulkActing(false);
    }
  };

  // Bulk restore — only meaningful in trash view
  const handleBulkRestore = async () => {
    if (selectedProducts.size === 0) return;
    setBulkActing(true);
    try {
      const ids = Array.from(selectedProducts);
      await Promise.all(ids.map((id) => api.admin.restoreProduct(id)));
      setAllProducts((prev) => prev.filter((p) => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      showToast(lang === "en" ? `${ids.length} restored` : `${ids.length}টি পুনরুদ্ধার হয়েছে`);
    } catch {
      showToast(lang === "en" ? "Bulk restore failed" : "বাল্ক পুনরুদ্ধার ব্যর্থ", "error");
    } finally {
      setBulkActing(false);
    }
  };

  const totalPages = Math.ceil(totalProducts / perPage);

  const inputCls = theme.input;
  const labelCls = theme.label;

  return (
    <DashboardLayout title={t("dash.products")}>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message={trashView
          ? (lang === "en" ? "Permanently delete this product? This cannot be undone." : "এই পণ্যটি স্থায়ীভাবে মুছবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।")
          : t("confirm.deleteProduct")}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("search.products")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setTrashView(v => !v)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors shrink-0 ${trashView ? "bg-red-50 border-red-200 text-red-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
            title={trashView ? "Exit trash view" : "Show trash"}
          >
            <FiTrash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{trashView ? (lang === "en" ? "Exit Trash" : "ট্র্যাশ ছাড়ুন") : (lang === "en" ? "Trash" : "ট্র্যাশ")}</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--primary-light)] transition-colors shrink-0"
          >
            <FiPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("btn.addProduct")}</span>
          </button>
        </div>
        {trashView && (
          <div className="px-4 py-2 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl">
            {lang === "en"
              ? "Viewing trash. Delete here is permanent. Restore to bring a product back."
              : "ট্র্যাশ ভিউ। এখান থেকে মুছলে স্থায়ী। পুনরুদ্ধার করে ফেরত আনুন।"}
            {trashLoading && " — loading…"}
          </div>
        )}

        {/* Bulk action toolbar — shown when products are selected */}
        {selectedProducts.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-xl">
            <span className="text-sm font-medium text-gray-700">
              {lang === "en" ? `${selectedProducts.size} selected` : `${toBn(selectedProducts.size)}টি নির্বাচিত`}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {!trashView && (
                <>
                  <button
                    type="button"
                    onClick={() => handleBulkSetActive(true)}
                    disabled={bulkActing}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-green-200 rounded-xl text-sm font-medium text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>{lang === "en" ? "Activate" : "সক্রিয়"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkSetActive(false)}
                    disabled={bulkActing}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    <span>{lang === "en" ? "Deactivate" : "নিষ্ক্রিয়"}</span>
                  </button>
                </>
              )}
              {trashView && (
                <button
                  type="button"
                  onClick={handleBulkRestore}
                  disabled={bulkActing}
                  className="flex items-center gap-1.5 px-3.5 py-2 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  ↩ <span>{lang === "en" ? "Restore" : "পুনরুদ্ধার"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkActing}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap ${
                  trashView
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "border border-red-200 text-red-600 hover:bg-red-50"
                }`}
              >
                <FiTrash2 className="w-4 h-4" />
                <span>
                  {trashView
                    ? (lang === "en" ? "Delete Forever" : "স্থায়ীভাবে মুছুন")
                    : (lang === "en" ? "Trash" : "ট্র্যাশ")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProducts(new Set())}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={lang === "en" ? "Clear selection" : "নির্বাচন বাতিল"}
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile select-all bar — mirrors orders page */}
        {products.length > 0 && (
          <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-100">
            <input
              type="checkbox"
              checked={selectedProducts.size > 0 && selectedProducts.size >= products.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-[var(--primary)] shrink-0"
            />
            <span className="text-xs font-medium text-gray-600">
              {selectedProducts.size > 0
                ? (lang === "en" ? `${selectedProducts.size} selected` : `${toBn(selectedProducts.size)}টি নির্বাচিত`)
                : (lang === "en" ? `Select all (${products.length})` : `সব নির্বাচন (${toBn(products.length)})`)}
            </span>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-gray-400">{t("empty.products")}</div>
          ) : products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(p.id)}
                    onChange={() => toggleSelectProduct(p.id)}
                    className="w-4 h-4 accent-[var(--primary)] shrink-0 mt-1"
                  />
                  {p.image ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewImage(resolveImg(p.image)); }}
                      onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoverPreview({ image: resolveImg(p.image), x: r.left + r.width / 2, y: r.top }); }}
                      onMouseLeave={() => setHoverPreview(null)}
                      className="shrink-0 cursor-zoom-in"
                      aria-label="Preview image"
                    >
                      <SafeImg src={resolveImg(p.image || "/placeholder.svg")} alt={p.name} className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                    </button>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <FiImage className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category?.name || "—"}{p.badge ? ` · ${p.badge}` : ""}</p>
                      </div>
                      <p className="text-base font-bold text-[var(--primary)] shrink-0">৳{toBn(p.price)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.is_active ? t("form.active") : t("form.inactive")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(p as any).unlimited_stock ? (lang === "en" ? "∞ Stock" : "∞ স্টক") : `${toBn(p.stock)} ${lang === "en" ? "stock" : "স্টক"}`}
                      </span>
                      {!((p as any).unlimited_stock) && ((p as any).has_variations || (p as any).hasVariations) && (p as any).variants?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(p as any).variants.map((v: any) => (
                            <span key={v.id || v.label} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{v.label}: {v.unlimited_stock ? "∞" : toBn(v.stock)}</span>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-gray-400">{toBn((p as any).sold_count ?? p.sold ?? 0)} {lang === "en" ? "sold" : "বিক্রি"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-1">
                <a href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"><FiEye className="w-4 h-4" /></a>
                <button onClick={() => openEdit(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><FiEdit2 className="w-4 h-4" /></button>
                <button onClick={() => duplicateProduct(p)} className="p-2 text-violet-600 hover:bg-violet-100 rounded-lg transition-colors"><FiCopy className="w-4 h-4" /></button>
                {trashView && (
                  <button onClick={() => handleRestore(p.id)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title={lang === "en" ? "Restore" : "পুনরুদ্ধার"}>↩</button>
                )}
                <button onClick={() => setDeleteId(p.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title={trashView ? (lang === "en" ? "Delete permanently" : "স্থায়ী মুছুন") : (lang === "en" ? "Move to trash" : "ট্র্যাশে পাঠান")}><FiTrash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-2 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size > 0 && selectedProducts.size >= products.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-[var(--primary)]"
                      />
                    </th>
                    {[t("th.image"), t("th.name"), t("th.category"), t("th.price"), t("th.stock"), t("th.sales"), t("th.status"), t("th.actions")].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">{t("empty.products")}</td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-2 py-3 w-8">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(p.id)}
                            onChange={() => toggleSelectProduct(p.id)}
                            className="w-4 h-4 accent-[var(--primary)]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {p.image ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewImage(resolveImg(p.image)); }}
                              onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoverPreview({ image: resolveImg(p.image), x: r.left + r.width / 2, y: r.top }); }}
                              onMouseLeave={() => setHoverPreview(null)}
                              className="cursor-zoom-in"
                              aria-label="Preview image"
                            >
                              <SafeImg src={resolveImg(p.image || "/placeholder.svg")} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <FiImage className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 max-w-44 truncate">{p.name}</div>
                          {p.badge && <span className="text-xs text-[var(--primary)] font-medium">{p.badge}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.category?.name || "—"}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--primary)] whitespace-nowrap">৳{toBn(p.price)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {(p as any).unlimited_stock ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{lang === "en" ? "Unlimited" : "আনলিমিটেড"}</span>
                          ) : ((p as any).has_variations || (p as any).hasVariations) && (p as any).variants?.length > 0 ? (
                            <div>
                              {(p as any).variants.every((v: any) => v.unlimited_stock) ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{lang === "en" ? "Unlimited" : "আনলিমিটেড"}</span>
                              ) : (
                                <span className="font-semibold text-sm">{toBn(p.stock)}</span>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(p as any).variants.map((v: any) => (
                                  <span key={v.id || v.label} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    {v.label}: {v.unlimited_stock ? "∞" : toBn(v.stock)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : toBn(p.stock)}
                        </td>
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
                            {trashView && (
                              <button onClick={() => handleRestore(p.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title={lang === "en" ? "Restore" : "পুনরুদ্ধার"}>
                                <span className="text-sm">↩</span>
                              </button>
                            )}
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={trashView ? (lang === "en" ? "Delete permanently" : "স্থায়ী মুছুন") : (lang === "en" ? "Move to trash" : "ট্র্যাশে পাঠান")}>
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
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-gray-400">
              {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalProducts)} / {totalProducts}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >{lang === "en" ? "← Prev" : "← আগের"}</button>
              <span className="px-3 py-1.5 text-xs font-semibold text-[var(--primary)]">{page} / {totalPages}</span>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t("modal.editProduct") : t("modal.newProduct")} size="xl" persistent
        headerAction={
          // Variable toggle lives in the modal header so it's always visible
          // even when scrolled deep into the form, and so the Price/Stock
          // fields below can be cleanly conditionally rendered.
          <button type="button" onClick={() => setForm(prev => ({ ...prev, has_variations: !prev.has_variations }))}
            className={`flex items-center gap-1.5 px-2.5 h-7 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              form.has_variations ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}>
            <span>{lang === "en" ? "Variable" : "ভ্যারিয়েবল"}</span>
            <div className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${form.has_variations ? "bg-[var(--primary)]" : "bg-gray-300"}`}>
              <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${form.has_variations ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
            </div>
          </button>
        }>
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
                  {/* Row: Price | Original Price | Stock — only for simple products.
                      Variable products derive these from per-variant rows below. */}
                  {!form.has_variations && (
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
                      <input name="stock" type="number" min="0" step="1"
                        value={form.has_variations ? form.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0) : form.stock}
                        onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, stock: v })); }}
                        className={inputCls + ((form.unlimited_stock || form.has_variations) ? " opacity-50" : "")} placeholder="0"
                        disabled={form.unlimited_stock || form.has_variations} />
                      {form.has_variations && <p className="text-[10px] text-gray-400 mt-0.5">{lang === "en" ? "Auto from variants" : "ভ্যারিয়েশন থেকে"}</p>}
                    </div>
                  </div>
                  )}
                  {/* Row: Unlimited toggle | Badge | Weight — hidden for variable products
                      since stock + badge + weight are per-variant concerns there. */}
                  {!form.has_variations && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 col-span-2">
                    <div>
                      <label className={labelCls}>&nbsp;</label>
                      <button type="button" onClick={() => { if (!form.has_variations) setForm(prev => ({ ...prev, unlimited_stock: !prev.unlimited_stock })); }}
                        className={`w-full h-[42px] flex items-center justify-between gap-1 px-2.5 rounded-xl border text-xs md:text-sm font-medium transition-all ${
                          form.has_variations ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed" :
                          form.unlimited_stock ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] cursor-pointer" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 cursor-pointer"
                        }`}>
                        <span>{lang === "en" ? "Unlimited" : "আনলিমিটেড"}</span>
                        <div className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${form.unlimited_stock ? "bg-[var(--primary)]" : "bg-gray-300"}`}>
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
                        const allBadges = [...new Set(allProducts.map((p) => p.badge).filter(Boolean) as string[])];
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
                    <div className="col-span-2 md:col-span-1">
                      <label className={labelCls}>{t("form.weight")}</label>
                      <input name="weight" value={form.weight} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, weight: v })); }} className={inputCls} placeholder="যেমন: ১০০গ্রাম" />
                    </div>
                  </div>
                  )}
                  {/* Custom Shipping */}
                  <div className="grid grid-cols-2 gap-3 col-span-2">
                    <div>
                      <label className={labelCls}>&nbsp;</label>
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, custom_shipping: !prev.custom_shipping }))}
                        className={`w-full h-[42px] flex items-center justify-between gap-1 px-2.5 rounded-xl border text-xs md:text-sm font-medium transition-all cursor-pointer ${
                          form.custom_shipping ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}>
                        <span>{lang === "en" ? "Custom Shipping" : "কাস্টম শিপিং"}</span>
                        <div className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${form.custom_shipping ? "bg-[var(--primary)]" : "bg-gray-300"}`}>
                          <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${form.custom_shipping ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
                        </div>
                      </button>
                    </div>
                    {form.custom_shipping && (
                      <div>
                        <label className={labelCls}>{lang === "en" ? "Shipping Cost" : "শিপিং খরচ"}</label>
                        <input name="shipping_cost" type="number" min="0" step="1" value={form.shipping_cost}
                          onChange={(e) => setForm(prev => ({ ...prev, shipping_cost: e.target.value }))}
                          className={inputCls} placeholder="৳ 120" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Description + Image — stacked on mobile, side by side on desktop */}
                <div className="flex flex-col md:flex-row gap-4 col-span-2">
                  <div className="md:flex-[4] flex flex-col">
                    <label className={labelCls}>{t("form.description")}</label>
                    <textarea name="description" value={form.description} onChange={(e) => { const v = e.target.value; setForm(prev => ({ ...prev, description: v })); }} className={inputCls + " resize-none flex-1 min-h-[120px]"} />
                  </div>
                  <div className="md:flex-[1]"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}>
                    <label className={labelCls}>{t("form.image")}</label>
                    <div className={`border-2 border-dashed rounded-xl transition-colors cursor-pointer ${dragOver ? "border-[var(--primary)] bg-green-50/50" : "border-gray-200 hover:border-gray-300"}`}
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
                            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <FiUploadCloud className="w-8 h-8 text-gray-300" />
                          )}
                          <p className="text-[10px] text-gray-400 text-center">Click to browse</p>
                        </div>
                      )}
                    </div>
                    {form.image && (
                      <button type="button" onClick={() => { setGalleryTarget("product"); setGalleryOpen(true); }}
                        className="w-full py-1.5 mt-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg text-[10px] font-medium text-white transition-colors flex items-center justify-center gap-1">
                        <FiImage className="w-3 h-3" /> {lang === "en" ? "Change" : "পরিবর্তন"}
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Additional product images ──
                    Optional gallery thumbnails shown beneath the main image
                    on the PDP. Click "Add image" to pick from MediaGallery;
                    click the × to remove a single thumb. Saved as a JSON
                    string in Product.images. */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>
                      {lang === "en" ? "Additional Images" : "অতিরিক্ত ছবি"}
                      <span className="text-[10px] text-gray-400 font-normal ml-1.5">
                        {lang === "en" ? "(shown in PDP gallery)" : "(গ্যালারিতে দেখাবে)"}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setGalleryTarget("additional"); setGalleryOpen(true); }}
                      className="px-2.5 py-1 text-[10px] font-medium text-[var(--primary)] border border-[var(--primary)]/30 rounded-lg hover:bg-[var(--primary)]/10 flex items-center gap-1"
                    >
                      <FiImage className="w-3 h-3" />
                      {lang === "en" ? "Add image" : "ছবি যোগ করুন"}
                    </button>
                  </div>
                  {form.images.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-4 px-3 text-center text-[11px] text-gray-400">
                      {lang === "en" ? "No additional images yet." : "এখনো কোনো অতিরিক্ত ছবি নেই।"}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {form.images.map((img, idx) => (
                        // Wrap in a div, not a button — child × is itself a
                        // button. The × is ALWAYS visible (no hover-only)
                        // so it works on touch devices too. Matches the
                        // main-image preview convention.
                        <div key={`${idx}-${img}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                          <SafeImg src={resolveImg(img)} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
                            }}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                            title={lang === "en" ? "Remove" : "মুছুন"}
                            aria-label={lang === "en" ? "Remove image" : "ছবি মুছুন"}
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Variable toggle moved to modal header (see Modal headerAction prop above). */}
                {/* Variations Detail (shown when toggle is on) */}
                {form.has_variations && (
                  <div className="border border-[var(--primary)]/20 bg-[var(--primary)]/[0.02] rounded-xl p-4 space-y-3">
                    <input value={form.variation_type} onChange={(e) => setForm(prev => ({ ...prev, variation_type: e.target.value }))}
                      className={inputCls} placeholder={lang === "en" ? "Variation type (e.g. Weight, Size, Color)" : "ভ্যারিয়েশন টাইপ (যেমন: ওজন, সাইজ, রং)"} />

                    {/* Bulk apply — sets the given field on every variant at once.
                        Field-level buttons (not a single Apply) so partial edits
                        don't accidentally overwrite other columns. */}
                    {form.variants.length > 0 && (
                      <div className="rounded-lg bg-white border border-dashed border-[var(--primary)]/30 p-2.5 space-y-2">
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                          {lang === "en" ? "Bulk apply to all variants" : "সব ভ্যারিয়েন্টে একসাথে প্রয়োগ"}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {([
                            { key: "price", label: lang === "en" ? "Price" : "দাম" },
                            { key: "original_price", label: lang === "en" ? "Original Price" : "আসল দাম" },
                            { key: "stock", label: lang === "en" ? "Stock" : "স্টক" },
                          ] as const).map(({ key, label }) => (
                            <div key={key} className="flex items-end gap-1 min-w-0">
                              <div className="flex-1 min-w-0">
                                <label className="text-[10px] text-gray-400 truncate block">{label}</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={bulk[key]}
                                  onChange={(e) => setBulk(b => ({ ...b, [key]: e.target.value }))}
                                  className={inputCls + " w-full"}
                                  placeholder="—"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={bulk[key] === ""}
                                onClick={() => {
                                  const val = bulk[key];
                                  if (val === "") return;
                                  setForm(prev => ({
                                    ...prev,
                                    variants: prev.variants.map(v => ({ ...v, [key]: val })),
                                  }));
                                }}
                                className="shrink-0 px-2.5 h-[34px] rounded-lg bg-[var(--primary)] text-white text-[11px] font-semibold hover:bg-[var(--primary-light)] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {lang === "en" ? "Apply" : "প্রয়োগ"}
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const allOn = form.variants.every(v => v.unlimited_stock);
                              setForm(prev => ({
                                ...prev,
                                variants: prev.variants.map(v => ({ ...v, unlimited_stock: !allOn })),
                              }));
                            }}
                            className="px-2.5 h-7 rounded-lg border border-gray-200 text-[11px] text-gray-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          >
                            {form.variants.every(v => v.unlimited_stock)
                              ? (lang === "en" ? "Uncheck Unlimited (all)" : "সব আনলিমিটেড বাদ")
                              : (lang === "en" ? "Check Unlimited (all)" : "সব আনলিমিটেড")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const allOn = form.variants.every(v => v.is_active);
                              setForm(prev => ({
                                ...prev,
                                variants: prev.variants.map(v => ({ ...v, is_active: !allOn })),
                              }));
                            }}
                            className="px-2.5 h-7 rounded-lg border border-gray-200 text-[11px] text-gray-600 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          >
                            {form.variants.every(v => v.is_active)
                              ? (lang === "en" ? "Deactivate all" : "সব নিষ্ক্রিয়")
                              : (lang === "en" ? "Activate all" : "সব সক্রিয়")}
                          </button>
                        </div>
                      </div>
                    )}

                    {form.variants.map((v, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-3 space-y-2 border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-6">{idx + 1}</span>
                          <input value={v.label} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], label: e.target.value }; setForm(prev => ({ ...prev, variants })); }}
                            className={inputCls + " flex-1"} placeholder={lang === "en" ? "Label (e.g. 400g)" : "লেবেল (যেমন: ৪০০ গ্রাম)"} />
                          <button type="button" onClick={() => { const variants = form.variants.filter((_, i) => i !== idx); setForm(prev => ({ ...prev, variants })); }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiX className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_42px] gap-2">
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
                            {v.unlimited_stock ? (
                              // Auto-collapse Stock to a green badge when Unlimited is on —
                              // typing a number here would be discarded anyway.
                              <div className={inputCls + " flex items-center justify-center text-[11px] font-medium text-emerald-600 bg-emerald-50 border-emerald-200"}>
                                {lang === "en" ? "Unlimited" : "আনলিমিটেড"}
                              </div>
                            ) : (
                              <input type="number" min="0" value={v.stock} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], stock: e.target.value }; setForm(prev => ({ ...prev, variants })); }}
                                className={inputCls} placeholder="0" />
                            )}
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
                                className="w-10 h-10 rounded-lg border border-dashed border-gray-300 flex items-center justify-center hover:border-[var(--primary)] transition-colors shrink-0" title={lang === "en" ? "Add image" : "ছবি যোগ করুন"}>
                                <FiImage className="w-4 h-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={v.unlimited_stock} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], unlimited_stock: e.target.checked }; setForm(prev => ({ ...prev, variants })); }}
                              className="w-3.5 h-3.5 accent-[var(--primary)]" />
                            {lang === "en" ? "Unlimited" : "আনলিমিটেড"}
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" checked={v.is_active} onChange={(e) => { const variants = [...form.variants]; variants[idx] = { ...variants[idx], is_active: e.target.checked }; setForm(prev => ({ ...prev, variants })); }}
                              className="w-3.5 h-3.5 accent-[var(--primary)]" />
                            {lang === "en" ? "Active" : "সক্রিয়"}
                          </label>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, variants: [...prev.variants, { label: "", price: "", original_price: "", sku: "", stock: "0", unlimited_stock: true, image: "", is_active: true }] }))}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline">
                      <FiPlus className="w-3.5 h-3.5" /> {lang === "en" ? "Add Variant" : "ভ্যারিয়েন্ট যোগ করুন"}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input name="is_active" type="checkbox" checked={form.is_active} onChange={(e) => { const v = e.target.checked; setForm(prev => ({ ...prev, is_active: v })); }} className="w-4 h-4 accent-[var(--primary)]" />
                    {t("form.active")}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input name="is_featured" type="checkbox" checked={form.is_featured} onChange={(e) => { const v = e.target.checked; setForm(prev => ({ ...prev, is_featured: v })); }} className="w-4 h-4 accent-[var(--primary)]" />
                    {t("form.featured")}
                  </label>
                </div>
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

      <MediaGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => {
          if (galleryTarget === "product") {
            setForm((prev) => ({ ...prev, image: url }));
          } else if (galleryTarget === "additional") {
            // Append to additional-images list, dedup by URL so accidental
            // double-clicks in MediaGallery don't bloat the array.
            setForm((prev) => prev.images.includes(url)
              ? prev
              : { ...prev, images: [...prev.images, url] });
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

      {/* Hover tooltip preview — floats above image, mirrors orders page UX */}
      {hoverPreview && (
        <div className="fixed z-[9999] pointer-events-none hidden md:block"
          style={{ left: hoverPreview.x, top: hoverPreview.y, transform: "translate(-50%, -100%) translateY(-8px)" }}>
          <div className="w-56 h-56 rounded-2xl overflow-hidden border-2 border-white shadow-2xl bg-white">
            <SafeImg src={hoverPreview.image} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Click-to-zoom fullscreen preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="relative aspect-square">
                  <SafeImg src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                </div>
              </div>
              <button onClick={() => setPreviewImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                <FiX className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

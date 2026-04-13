"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import Toast from "@/components/Toast";
import { SafeImg } from "@/components/SafeImage";
import MediaGallery from "@/components/MediaGallery";
import { theme } from "@/lib/theme";

import { useAutoSlug } from "@/lib/useAutoSlug";
import {
  FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiX,
  FiChevronDown, FiChevronUp, FiSearch,
} from "react-icons/fi";
import { TableSkeleton } from "@/components/DashboardSkeleton";

const inputCls = theme.input;
const labelCls = theme.label;

/* ───── types ───── */
interface LandingPage {
  id: number;
  slug: string;
  title: string;
  is_active: boolean;
  primary_color: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_image: string;
  hero_cta: string;
  hero_trust_text: string;
  hero_badge: string;
  problem_title: string;
  problem_points: string;
  features: string;
  testimonials: string;
  how_it_works: string;
  faq: string;
  products: string;
  products_title: string;
  products_subtitle: string;
  features_title: string;
  features_image: string;
  testimonials_title: string;
  testimonials_mode: string; // "all_site" | "select" | "custom"
  how_it_works_title: string;
  how_it_works_subtitle: string;
  faq_title: string;
  checkout_title: string;
  checkout_subtitle: string;
  checkout_btn_text: string;
  shipping_cost: string;
  custom_shipping: boolean;
  show_email: boolean;
  show_city: boolean;
  guarantee_text: string;
  success_message: string;
  meta_title: string;
  meta_description: string;
  whatsapp: string;
  section_visibility: Record<string, boolean>;
}

interface ProductOption {
  id: number;
  name: string;
  price: number;
  image?: string;
}

interface ProductEntry { product_id: number; quantity: number }
interface FeatureEntry { icon: string; title: string; description: string }
interface ProblemEntry { text: string; icon: string }
interface TestimonialEntry { name: string; review: string; rating: number; image?: string }
interface StepEntry { title: string; description: string }
interface FaqEntry { question: string; answer: string }

/* ───── empty form ───── */
const emptyForm = {
  title: "",
  slug: "",
  is_active: true,
  primary_color: "#0f5931",
  hero_headline: "",
  hero_subheadline: "",
  hero_image: "",
  hero_cta: "",
  hero_trust_text: "",
  hero_badge: "",
  problem_title: "",
  problem_points: [] as ProblemEntry[],
  features: [] as FeatureEntry[],
  testimonials: [] as TestimonialEntry[],
  how_it_works: [] as StepEntry[],
  faq: [] as FaqEntry[],
  products: [] as ProductEntry[],
  products_title: "",
  products_subtitle: "",
  features_title: "",
  features_image: "",
  testimonials_title: "",
  testimonials_mode: "custom",
  how_it_works_title: "",
  how_it_works_subtitle: "",
  faq_title: "",
  checkout_title: "",
  checkout_subtitle: "",
  checkout_btn_text: "",
  shipping_cost: "60",
  custom_shipping: false,
  show_email: false,
  show_city: true,
  guarantee_text: "",
  success_message: "",
  meta_title: "",
  meta_description: "",
  whatsapp: "",
  section_visibility: { hero: true, problem: true, products: true, features: true, how_it_works: true, testimonials: true, faq: true, checkout: true } as Record<string, boolean>,
};

type FormState = typeof emptyForm;

/* ───── collapsible section ───── */
function Section({
  title,
  icon,
  open,
  onToggle,
  visible,
  onVisibilityToggle,
  children,
}: {
  title: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  visible?: boolean;
  onVisibilityToggle?: () => void;
  children: React.ReactNode;
}) {
  const isHidden = visible === false;
  return (
    <div className={`border rounded-xl transition-opacity ${isHidden ? "border-red-200 opacity-60" : "border-gray-100"}`}>
      <div className="flex items-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-xl">
        <button type="button" onClick={onToggle} className="flex-1 flex items-center justify-between px-4 py-3">
          <span className={`flex items-center gap-2 text-sm font-semibold ${isHidden ? "text-gray-400 line-through" : "text-gray-700"}`}>
            {icon} {title}
            {isHidden && <span className="text-[10px] text-red-400 font-normal no-underline ml-1">(hidden)</span>}
          </span>
          {open ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {onVisibilityToggle && (
          <button type="button" onClick={onVisibilityToggle} className={`px-3 py-3 transition-colors ${isHidden ? "text-red-400 hover:text-red-600" : "text-green-500 hover:text-green-700"}`}
            title={isHidden ? "Show section" : "Hide section"}>
            {isHidden ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

/* ───── main page ───── */
export default function LandingPagesPage() {
  const generateSlug = useAutoSlug();

  const [items, setItems] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<string>("hero"); // "hero", "testimonial-{idx}", "problem-{idx}"
  const [siteReviews, setSiteReviews] = useState<TestimonialEntry[]>([]);
  const [siteReviewsLoaded, setSiteReviewsLoaded] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  // Collapsible sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const isOpen = (key: string) => !!expanded[key];
  const toggleVis = (key: string) => setForm((f) => ({
    ...f,
    section_visibility: { ...f.section_visibility, [key]: f.section_visibility[key] === false ? true : false },
  }));

  // Products picker
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState("");

  /* ───── data fetching ───── */
  const fetchAll = useCallback((background = false) => {
    if (!background) setLoading(true);
    api.admin
      .getLandingPages()
      .then((res: { data?: LandingPage[] }) => setItems(res.data || (res as unknown as LandingPage[]) || []))
      .catch(() => {
        if (!background) showToast("Failed to load data", "error");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ───── helpers ───── */
  const safeParseJson = <T,>(val: string | T[] | undefined | null, fallback: T[]): T[] => {
    if (Array.isArray(val)) return val;
    if (!val) return fallback;
    try {
      return JSON.parse(val as string);
    } catch {
      return fallback;
    }
  };

  const countProducts = (item: LandingPage): number => {
    return safeParseJson<ProductEntry>(item.products, []).length;
  };

  /* ───── open create / edit ───── */
  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setExpanded({});
    setModalOpen(true);
    fetchProducts();
  };

  const openEdit = (item: LandingPage) => {
    setEditId(item.id);
    setForm({
      title: item.title || "",
      slug: item.slug || "",
      is_active: item.is_active,
      primary_color: item.primary_color || "#0f5931",
      hero_headline: item.hero_headline || "",
      hero_subheadline: item.hero_subheadline || "",
      hero_image: item.hero_image || "",
      hero_cta: item.hero_cta || "",
      hero_trust_text: item.hero_trust_text || "",
      hero_badge: item.hero_badge || "",
      problem_title: item.problem_title || "",
      problem_points: (() => {
        const raw = safeParseJson<any>(item.problem_points, []);
        return raw.map((p: any) => typeof p === "string" ? { text: p, icon: "" } : { text: p.text || "", icon: p.icon || "" });
      })(),
      features: safeParseJson<FeatureEntry>(item.features, []),
      testimonials: safeParseJson<TestimonialEntry>(item.testimonials, []),
      how_it_works: safeParseJson<StepEntry>(item.how_it_works, []),
      faq: safeParseJson<FaqEntry>(item.faq, []),
      products: safeParseJson<ProductEntry>(item.products, []),
      products_title: item.products_title || "",
      products_subtitle: item.products_subtitle || (item as any).products_sub || "",
      features_title: item.features_title || "",
      features_image: item.features_image || "",
      testimonials_title: item.testimonials_title || "",
      testimonials_mode: item.testimonials_mode || "custom",
      how_it_works_title: item.how_it_works_title || "",
      how_it_works_subtitle: item.how_it_works_subtitle || (item as any).how_it_works_sub || "",
      faq_title: item.faq_title || "",
      checkout_title: item.checkout_title || "",
      checkout_subtitle: item.checkout_subtitle || "",
      checkout_btn_text: item.checkout_btn_text || "",
      shipping_cost: String(item.shipping_cost ?? 60),
      custom_shipping: item.custom_shipping ?? false,
      show_email: item.show_email ?? false,
      show_city: item.show_city ?? true,
      guarantee_text: item.guarantee_text || "",
      success_message: item.success_message || "",
      meta_title: item.meta_title || "",
      meta_description: item.meta_description || "",
      whatsapp: item.whatsapp || "",
      section_visibility: (() => {
        try { return JSON.parse(String(item.section_visibility || "{}")); } catch { return {}; }
      })(),
    });
    setExpanded({});
    setModalOpen(true);
    fetchProducts();
  };

  const fetchProducts = () => {
    api.admin
      .getProducts("per_page=200")
      .then((res: { data?: Record<string, unknown>[] }) => {
        const data = res.data || (res as unknown as Record<string, unknown>[]) || [];
        setAllProducts(
          Array.isArray(data)
            ? data.map((p) => ({
                id: p.id as number,
                name: (p.name as string) || "",
                price: Number(p.price) || 0,
                image: (p.image as string) || "",
              }))
            : []
        );
      })
      .catch(() => {});
  };

  /* ───── title -> slug ───── */
  const handleTitleChange = (val: string) => {
    setForm((prev) => ({ ...prev, title: val }));
    if (!editId) {
      generateSlug(val, (slug: string) => setForm((prev) => ({ ...prev, slug })));
    }
  };

  /* ───── image upload ───── */
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Invalid image", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image too large", "error");
      return;
    }
    setUploading(true);
    try {
      const res = await api.admin.upload(file);
      setForm((prev) => ({ ...prev, hero_image: res.url || res.path }));
      showToast("Image uploaded");
    } catch {
      showToast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = "";
  };

  /* ───── product picker helpers ───── */
  const addProduct = (product: ProductOption) => {
    if (form.products.some((p) => p.product_id === product.id)) {
      showToast("Already added", "error");
      return;
    }
    setForm((prev) => ({
      ...prev,
      products: [...prev.products, { product_id: product.id, quantity: 1 }],
    }));
    setProductSearch("");
  };

  const removeProduct = (productId: number) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.product_id !== productId),
    }));
  };

  const updateProductQty = (productId: number, qty: number) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.product_id === productId ? { ...p, quantity: Math.max(1, qty) } : p
      ),
    }));
  };

  const getProductName = (productId: number) => {
    return allProducts.find((p) => p.id === productId)?.name || `#${productId}`;
  };

  /* ───── dynamic list helpers ───── */
  const updateField = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  /* ───── submit ───── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, unknown> = {
      title: form.title,
      slug: form.slug || undefined,
      is_active: form.is_active,
      primary_color: form.primary_color,
      hero_headline: form.hero_headline || undefined,
      hero_subheadline: form.hero_subheadline || undefined,
      hero_image: form.hero_image || undefined,
      hero_cta: form.hero_cta || undefined,
      hero_trust_text: form.hero_trust_text || undefined,
      hero_badge: form.hero_badge || undefined,
      problem_title: form.problem_title || undefined,
      problem_points: JSON.stringify(form.problem_points),
      features: JSON.stringify(form.features),
      testimonials: JSON.stringify(form.testimonials),
      how_it_works: JSON.stringify(form.how_it_works),
      faq: JSON.stringify(form.faq),
      products: JSON.stringify(form.products),
      products_title: form.products_title || undefined,
      products_subtitle: form.products_subtitle || undefined,
      features_title: form.features_title || undefined,
      features_image: form.features_image || undefined,
      testimonials_title: form.testimonials_title || undefined,
      testimonials_mode: form.testimonials_mode,
      how_it_works_title: form.how_it_works_title || undefined,
      how_it_works_subtitle: form.how_it_works_subtitle || undefined,
      faq_title: form.faq_title || undefined,
      checkout_title: form.checkout_title || undefined,
      checkout_subtitle: form.checkout_subtitle || undefined,
      checkout_btn_text: form.checkout_btn_text || undefined,
      shipping_cost: form.custom_shipping ? (Number(form.shipping_cost) || 60) : undefined,
      custom_shipping: form.custom_shipping,
      show_email: form.show_email,
      show_city: form.show_city,
      guarantee_text: form.guarantee_text || undefined,
      success_message: form.success_message || undefined,
      meta_title: form.meta_title || undefined,
      meta_description: form.meta_description || undefined,
      whatsapp: form.whatsapp || undefined,
      section_visibility: JSON.stringify(form.section_visibility),
    };

    try {
      if (editId) {
        const res = await api.admin.updateLandingPage(editId, payload);
        const updated = res.data || res;
        setItems((prev) => prev.map((x) => (x.id === editId ? { ...x, ...updated } : x)));
        showToast("Updated successfully!");
      } else {
        const res = await api.admin.createLandingPage(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast("Created successfully!");
      }
      setModalOpen(false);
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ───── delete ───── */
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.admin.deleteLandingPage(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      showToast("Deleted successfully!");
      setDeleteId(null);
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ───── filter ───── */
  const filtered = items.filter(
    (item) =>
      (item.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.slug || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
      !form.products.some((fp) => fp.product_id === p.id)
  );

  /* ───── render ───── */
  return (
    <DashboardLayout title="Landing Pages">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: "" })} />
      <ConfirmDialog
        open={!!deleteId}
        message="Are you sure you want to delete this landing page? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search landing pages..."
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
            {"Add New"}
          </button>
        </div>

        {/* table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[
                      "Title",
                      "Slug",
                      "Products",
                      "Status",
                      "",
                    ].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        {"No landing pages found"}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">{item.title}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.slug}</td>
                        <td className="px-4 py-3 text-gray-600">{countProducts(item)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`/lp/${item.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
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

      {/* ───── CREATE / EDIT MODAL ───── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Landing Page" : "New Landing Page"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* ─── 1. Basic Info (always open) ─── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              {"📋"} {"Basic Info"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className={inputCls}
                  placeholder="Amazing Product Page"
                />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className={inputCls}
                  placeholder="auto-generated-from-title"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className={inputCls}
                    placeholder="#0f5931"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 accent-[#0f5931]"
                  />
                  Active
                </label>
              </div>
            </div>
            <div>
              <label className={labelCls}>WhatsApp Number</label>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className={inputCls}
                placeholder="01XXXXXXXXX"
              />
              <p className="text-[10px] text-gray-400 mt-1">Floating WhatsApp icon will appear on the landing page</p>
            </div>
          </div>

          {/* ─── 2. Hero Section ─── */}
          <Section title="Hero Section" icon="🎯" open={isOpen("hero")} onToggle={() => toggle("hero")}
            visible={form.section_visibility.hero !== false} onVisibilityToggle={() => toggleVis("hero")}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Headline</label>
                <input
                  value={form.hero_headline}
                  onChange={(e) => setForm({ ...form, hero_headline: e.target.value })}
                  className={inputCls}
                  placeholder="Transform your life today"
                />
              </div>
              <div>
                <label className={labelCls}>CTA Button Text</label>
                <input
                  value={form.hero_cta}
                  onChange={(e) => setForm({ ...form, hero_cta: e.target.value })}
                  className={inputCls}
                  placeholder="Order Now"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Subheadline</label>
              <textarea
                rows={2}
                value={form.hero_subheadline}
                onChange={(e) => setForm({ ...form, hero_subheadline: e.target.value })}
                className={inputCls + " resize-none"}
              />
            </div>
            <div>
              <label className={labelCls}>Trust Badges (one per line)</label>
              <textarea
                rows={3}
                value={form.hero_trust_text}
                onChange={(e) => setForm({ ...form, hero_trust_text: e.target.value })}
                className={inputCls + " resize-none"}
                placeholder={"১০০% ন্যাচারাল ও কেমিক্যাল ফ্রি\nসারা বাংলাদেশে ডেলিভারি\nক্যাশ অন ডেলিভারি"}
              />
              <p className="text-[10px] text-gray-400 mt-1">Each line becomes a separate badge</p>
            </div>
            <div>
              <label className={labelCls}>Hero Image / Video</label>
              {form.hero_image ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-2">
                  {form.hero_image.includes("youtube.com") || form.hero_image.includes("youtu.be") ? (
                    <div className="aspect-video bg-black">
                      <iframe src={form.hero_image.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                        className="w-full h-full" allowFullScreen />
                    </div>
                  ) : form.hero_image.match(/\.(mp4|webm|mov)$/i) ? (
                    <video src={form.hero_image} controls className="w-full max-h-40 bg-black" />
                  ) : (
                    <SafeImg src={form.hero_image} alt="Hero" className="w-full max-h-40 object-cover" />
                  )}
                  <button type="button" onClick={() => setForm({ ...form, hero_image: "" })}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600">
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setGalleryTarget("hero"); setGalleryOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#0f5931] transition-colors text-sm text-gray-500 flex-1">
                  🖼️ Media Gallery
                </button>
                <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#0f5931] transition-colors text-sm text-gray-500">
                  <input type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                  {uploading ? "..." : "⬆️ Upload"}
                </label>
              </div>
            </div>
          </Section>

          {/* ─── 3. Problem Section ─── */}
          <Section title="Problem Section" icon="⚠️" open={isOpen("problem")} onToggle={() => toggle("problem")}
            visible={form.section_visibility.problem !== false} onVisibilityToggle={() => toggleVis("problem")}>
            <div>
              <label className={labelCls}>Section Title</label>
              <input
                value={form.problem_title}
                onChange={(e) => setForm({ ...form, problem_title: e.target.value })}
                className={inputCls}
                placeholder="Are you facing these problems?"
              />
            </div>
            {form.problem_points.map((point, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="shrink-0">
                  {point.icon ? (
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-gray-200">
                      <SafeImg src={point.icon} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => {
                        const updated = [...form.problem_points];
                        updated[idx] = { ...updated[idx], icon: "" };
                        updateField("problem_points", updated);
                      }} className="absolute -top-0.5 -right-0.5 p-0.5 bg-red-500 text-white rounded-full">
                        <FiX className="w-2 h-2" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setGalleryTarget(`problem-${idx}`); setGalleryOpen(true); }}
                      className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors text-gray-400 text-xs" title="Add icon/image">
                      🖼️
                    </button>
                  )}
                </div>
                <input
                  value={point.text}
                  onChange={(e) => {
                    const updated = [...form.problem_points];
                    updated[idx] = { ...updated[idx], text: e.target.value };
                    updateField("problem_points", updated);
                  }}
                  className={inputCls + " flex-1"}
                  placeholder={`Problem point ${idx + 1}`}
                />
                <button
                  type="button"
                  onClick={() => updateField("problem_points", form.problem_points.filter((_, i) => i !== idx))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("problem_points", [...form.problem_points, { text: "", icon: "" }])}
              className="flex items-center gap-1 text-xs font-medium text-[#0f5931] hover:underline"
            >
              <FiPlus className="w-3.5 h-3.5" /> {"Add Point"}
            </button>
          </Section>

          {/* ─── 4. Products ─── */}
          <Section title="Products" icon="📦" open={isOpen("products")} onToggle={() => toggle("products")}
            visible={form.section_visibility.products !== false} onVisibilityToggle={() => toggleVis("products")}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>Section Title</label>
                <input value={form.products_title} onChange={(e) => setForm({ ...form, products_title: e.target.value })} className={inputCls} placeholder="আমাদের প্রোডাক্ট" />
              </div>
              <div>
                <label className={labelCls}>Subtitle</label>
                <input value={form.products_subtitle} onChange={(e) => setForm({ ...form, products_subtitle: e.target.value })} className={inputCls} placeholder="১০০% খাঁটি ও প্রিমিয়াম মানের" />
              </div>
            </div>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#0f5931] focus:outline-none"
                placeholder="Search products..."
              />
              {productSearch && filteredProducts.length > 0 && (
                <div className="absolute z-[100] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProducts.slice(0, 10).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 transition-colors"
                    >
                      {p.image && (
                        <SafeImg src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover" />
                      )}
                      <span className="flex-1 truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.products.length > 0 && (
              <div className="space-y-2">
                {form.products.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                      {getProductName(entry.product_id)}
                    </span>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500">Qty:</label>
                      <input
                        type="number"
                        min={1}
                        value={entry.quantity}
                        onChange={(e) => updateProductQty(entry.product_id, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:border-[#0f5931] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(entry.product_id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ─── 5. Features / Benefits ─── */}
          <Section title="Features / Benefits" icon="✨" open={isOpen("features")} onToggle={() => toggle("features")}
            visible={form.section_visibility.features !== false} onVisibilityToggle={() => toggleVis("features")}>
            <div className="mb-3">
              <label className={labelCls}>Section Title</label>
              <input value={form.features_title} onChange={(e) => setForm({ ...form, features_title: e.target.value })} className={inputCls} placeholder="🔥 কেন এই প্রোডাক্ট ব্যবহার করবেন?" />
            </div>
            <div className="mb-3">
              <label className={labelCls}>Image Badge Text</label>
              <input
                value={form.hero_badge}
                onChange={(e) => setForm({ ...form, hero_badge: e.target.value })}
                className={inputCls}
                placeholder="100% Natural"
              />
              <p className="text-[10px] text-gray-400 mt-1">Floating badge on the image. Use \n for line break (e.g. &quot;100%\nNatural&quot;)</p>
            </div>
            <div className="mb-3">
              <label className={labelCls}>Features Image / Video</label>
              {form.features_image ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-2">
                  {form.features_image.match(/\.(mp4|webm|mov)$/i) ? (
                    <video src={form.features_image} className="w-full max-h-40 object-cover" controls />
                  ) : form.features_image.includes("youtube.com") || form.features_image.includes("youtu.be") ? (
                    <div className="aspect-video"><iframe src={form.features_image.replace("watch?v=", "embed/")} className="w-full h-full rounded-xl" allowFullScreen /></div>
                  ) : (
                    <SafeImg src={form.features_image} alt="Features" className="w-full max-h-40 object-cover" />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button type="button" onClick={() => { setGalleryTarget("features"); setGalleryOpen(true); }}
                      className="p-1.5 bg-white/90 rounded-lg text-xs hover:bg-white">🖼️</button>
                    <button type="button" onClick={() => setForm({ ...form, features_image: "" })}
                      className="p-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">✕</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setGalleryTarget("features"); setGalleryOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#0f5931] transition-colors text-sm text-gray-500 flex-1">
                    🖼️ গ্যালারি থেকে বাছুন
                  </button>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">This image shows alongside the features list. If empty, hero image will be used.</p>
            </div>
            {form.features.map((feat, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={feat.icon}
                    onChange={(e) => {
                      const updated = [...form.features];
                      updated[idx] = { ...updated[idx], icon: e.target.value };
                      updateField("features", updated);
                    }}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:border-[#0f5931] focus:outline-none"
                    placeholder="🔥"
                  />
                  <input
                    value={feat.title}
                    onChange={(e) => {
                      const updated = [...form.features];
                      updated[idx] = { ...updated[idx], title: e.target.value };
                      updateField("features", updated);
                    }}
                    className={inputCls + " flex-1"}
                    placeholder="Feature title"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("features", form.features.filter((_, i) => i !== idx))}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={feat.description}
                  onChange={(e) => {
                    const updated = [...form.features];
                    updated[idx] = { ...updated[idx], description: e.target.value };
                    updateField("features", updated);
                  }}
                  className={inputCls + " resize-none"}
                  placeholder="Feature description"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("features", [...form.features, { icon: "", title: "", description: "" }])}
              className="flex items-center gap-1 text-xs font-medium text-[#0f5931] hover:underline"
            >
              <FiPlus className="w-3.5 h-3.5" /> {"Add Feature"}
            </button>
          </Section>

          {/* ─── 6. Testimonials ─── */}
          {/* ─── 6. How It Works ─── */}
          <Section title="How It Works" icon="🔢" open={isOpen("how_it_works")} onToggle={() => toggle("how_it_works")}
            visible={form.section_visibility.how_it_works !== false} onVisibilityToggle={() => toggleVis("how_it_works")}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>Section Title</label>
                <input value={form.how_it_works_title} onChange={(e) => setForm({ ...form, how_it_works_title: e.target.value })} className={inputCls} placeholder="কিভাবে ব্যবহার করবেন?" />
              </div>
              <div>
                <label className={labelCls}>Subtitle</label>
                <input value={form.how_it_works_subtitle} onChange={(e) => setForm({ ...form, how_it_works_subtitle: e.target.value })} className={inputCls} placeholder="অত্যন্ত সহজ ৪টি ধাপ" />
              </div>
            </div>
            {form.how_it_works.map((step, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 flex items-center justify-center bg-[#0f5931] text-white text-xs font-bold rounded-full shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    value={step.title}
                    onChange={(e) => {
                      const updated = [...form.how_it_works];
                      updated[idx] = { ...updated[idx], title: e.target.value };
                      updateField("how_it_works", updated);
                    }}
                    className={inputCls + " flex-1"}
                    placeholder="Step title"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("how_it_works", form.how_it_works.filter((_, i) => i !== idx))}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={step.description}
                  onChange={(e) => {
                    const updated = [...form.how_it_works];
                    updated[idx] = { ...updated[idx], description: e.target.value };
                    updateField("how_it_works", updated);
                  }}
                  className={inputCls + " resize-none"}
                  placeholder="Step description"
                />
              </div>
            ))}
            {form.how_it_works.length < 5 && (
              <button
                type="button"
                onClick={() => updateField("how_it_works", [...form.how_it_works, { title: "", description: "" }])}
                className="flex items-center gap-1 text-xs font-medium text-[#0f5931] hover:underline"
              >
                <FiPlus className="w-3.5 h-3.5" /> {"Add Step"}
              </button>
            )}
            {form.how_it_works.length >= 5 && (
              <p className="text-xs text-gray-400">Maximum 5 steps</p>
            )}
          </Section>

          {/* ─── 7. Testimonials ─── */}
          <Section title="Testimonials" icon="💬" open={isOpen("testimonials")} onToggle={() => toggle("testimonials")}
            visible={form.section_visibility.testimonials !== false} onVisibilityToggle={() => toggleVis("testimonials")}>
            <div className="mb-3">
              <label className={labelCls}>Section Title</label>
              <input value={form.testimonials_title} onChange={(e) => setForm({ ...form, testimonials_title: e.target.value })} className={inputCls} placeholder="গ্রাহকদের মন্তব্য" />
            </div>

            {/* Mode selector */}
            <div className="mb-4">
              <label className={labelCls}>Source</label>
              <div className="flex gap-2">
                {[
                  { id: "all_site", label: "🌐 All Site Reviews", desc: "Show all approved reviews automatically" },
                  { id: "select", label: "📋 Pick from Site", desc: "Browse & select specific reviews" },
                  { id: "custom", label: "✍️ Custom", desc: "Write your own testimonials" },
                ].map((mode) => (
                  <button key={mode.id} type="button"
                    onClick={() => {
                      setForm({ ...form, testimonials_mode: mode.id });
                      if (mode.id === "select" && !siteReviewsLoaded) {
                        fetch("/api/v1/reviews/approved", { credentials: "include" }).then(r => r.json()).then(data => {
                          setSiteReviews((Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => ({
                            name: (r.customer_name as string) || "", review: (r.review as string) || "",
                            rating: Number(r.rating) || 5, image: (r.image as string) || "",
                          })));
                          setSiteReviewsLoaded(true);
                        }).catch(() => {});
                      }
                    }}
                    className={`flex-1 p-3 rounded-xl text-xs font-medium text-center transition-all border-2 ${
                      form.testimonials_mode === mode.id
                        ? "border-[#0f5931] bg-[#0f5931]/5 text-[#0f5931]"
                        : "border-gray-100 text-gray-500 hover:border-gray-200"
                    }`}>
                    <div className="text-sm mb-0.5">{mode.label}</div>
                    <div className="text-[10px] opacity-70">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ALL SITE mode — no form needed, renders dynamically */}
            {form.testimonials_mode === "all_site" && (
              <div className="bg-blue-50 rounded-xl p-4 text-center text-sm text-blue-700">
                ✅ All approved site reviews will be shown automatically in a carousel on the landing page. No manual selection needed.
              </div>
            )}

            {/* SELECT mode — browse site reviews and pick */}
            {form.testimonials_mode === "select" && (
              <div className="space-y-3">
                {/* Selected reviews */}
                {form.testimonials.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Selected ({form.testimonials.length}):</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {form.testimonials.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm">
                          {t.image && <SafeImg src={t.image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />}
                          <span className="flex-1 truncate font-medium">{t.name}</span>
                          <span className="text-xs text-gray-400">⭐{t.rating}</span>
                          <button type="button" onClick={() => updateField("testimonials", form.testimonials.filter((_, i) => i !== idx))}
                            className="p-1 text-red-400 hover:text-red-600"><FiX className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Browse site reviews */}
                <p className="text-xs font-medium text-gray-500">Available reviews — click ➕ to add:</p>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-2">
                  {siteReviews.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">No approved reviews found</p>
                  ) : siteReviews.filter(sr => !form.testimonials.some(t => t.name === sr.name && t.review === sr.review)).map((sr, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                      {sr.image && <SafeImg src={sr.image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{sr.name}</span>
                          <span className="text-xs text-amber-500">{"⭐".repeat(sr.rating)}</span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{sr.review}</p>
                      </div>
                      <button type="button" onClick={() => updateField("testimonials", [...form.testimonials, sr])}
                        className="shrink-0 p-1.5 bg-[#0f5931] text-white rounded-lg hover:bg-[#12693a] transition-colors text-xs">
                        <FiPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CUSTOM mode — manual entry */}
            {form.testimonials_mode === "custom" && (
              <div className="space-y-3">
                {form.testimonials.map((test, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="shrink-0">
                        {test.image ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                            <SafeImg src={test.image} alt={test.name} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => {
                              const updated = [...form.testimonials];
                              updated[idx] = { ...updated[idx], image: "" };
                              updateField("testimonials", updated);
                            }} className="absolute -top-0.5 -right-0.5 p-0.5 bg-red-500 text-white rounded-full">
                              <FiX className="w-2 h-2" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setGalleryTarget(`testimonial-${idx}`); setGalleryOpen(true); }}
                            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors text-gray-400 text-xs" title="Add photo">
                            📷
                          </button>
                        )}
                      </div>
                      <input value={test.name} onChange={(e) => { const u = [...form.testimonials]; u[idx] = { ...u[idx], name: e.target.value }; updateField("testimonials", u); }}
                        className={inputCls + " flex-1"} placeholder="Customer name" />
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500">⭐</label>
                        <input type="number" min={1} max={5} value={test.rating}
                          onChange={(e) => { const u = [...form.testimonials]; u[idx] = { ...u[idx], rating: Math.min(5, Math.max(1, Number(e.target.value))) }; updateField("testimonials", u); }}
                          className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:border-[#0f5931] focus:outline-none" />
                      </div>
                      <button type="button" onClick={() => updateField("testimonials", form.testimonials.filter((_, i) => i !== idx))}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiX className="w-4 h-4" /></button>
                    </div>
                    <textarea rows={2} value={test.review} onChange={(e) => { const u = [...form.testimonials]; u[idx] = { ...u[idx], review: e.target.value }; updateField("testimonials", u); }}
                      className={inputCls + " resize-none"} placeholder="Customer review" />
                  </div>
                ))}
                <button type="button" onClick={() => updateField("testimonials", [...form.testimonials, { name: "", review: "", rating: 5, image: "" }])}
                  className="flex items-center gap-1 text-xs font-medium text-[#0f5931] hover:underline">
                  <FiPlus className="w-3.5 h-3.5" /> Add Testimonial
                </button>
              </div>
            )}
          </Section>

          {/* ─── 8. FAQ ─── */}
          <Section title="FAQ" icon="❓" open={isOpen("faq")} onToggle={() => toggle("faq")}
            visible={form.section_visibility.faq !== false} onVisibilityToggle={() => toggleVis("faq")}>
            <div className="mb-3">
              <label className={labelCls}>Section Title</label>
              <input value={form.faq_title} onChange={(e) => setForm({ ...form, faq_title: e.target.value })} className={inputCls} placeholder="সাধারণ কিছু প্রশ্ন (FAQ)" />
            </div>
            {form.faq.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={item.question}
                    onChange={(e) => {
                      const updated = [...form.faq];
                      updated[idx] = { ...updated[idx], question: e.target.value };
                      updateField("faq", updated);
                    }}
                    className={inputCls + " flex-1"}
                    placeholder="Question"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("faq", form.faq.filter((_, i) => i !== idx))}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={item.answer}
                  onChange={(e) => {
                    const updated = [...form.faq];
                    updated[idx] = { ...updated[idx], answer: e.target.value };
                    updateField("faq", updated);
                  }}
                  className={inputCls + " resize-none"}
                  placeholder="Answer"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("faq", [...form.faq, { question: "", answer: "" }])}
              className="flex items-center gap-1 text-xs font-medium text-[#0f5931] hover:underline"
            >
              <FiPlus className="w-3.5 h-3.5" /> {"Add FAQ"}
            </button>
          </Section>

          {/* ─── 9. Checkout & Thank You ─── */}
          <Section title="Checkout & Thank You" icon="🎉" open={isOpen("checkout")} onToggle={() => toggle("checkout")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Checkout Title</label>
                <input value={form.checkout_title} onChange={(e) => setForm({ ...form, checkout_title: e.target.value })}
                  className={inputCls} placeholder="🛒 আপনার অর্ডার দিন এখনই" />
              </div>
              <div>
                <label className={labelCls}>Order Button Text</label>
                <input value={form.checkout_btn_text} onChange={(e) => setForm({ ...form, checkout_btn_text: e.target.value })}
                  className={inputCls} placeholder="অর্ডার কনফার্ম করুন" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Checkout Subtitle</label>
              <input value={form.checkout_subtitle} onChange={(e) => setForm({ ...form, checkout_subtitle: e.target.value })}
                className={inputCls} placeholder="নিচের ফরমটি পূরণ করে অর্ডারটি কনফার্ম করুন।" />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.custom_shipping} onChange={(e) => setForm({ ...form, custom_shipping: e.target.checked })}
                  className="w-4 h-4 accent-[#0f5931]" />
                <span className="font-medium">Custom Shipping Cost</span>
                <span className="text-xs text-gray-400">(overrides site shipping zones)</span>
              </label>
              {form.custom_shipping && (
                <div>
                  <label className={labelCls}>Fixed Shipping Cost (৳)</label>
                  <input type="number" min="0" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
                    className={inputCls} placeholder="60" />
                  <p className="text-[10px] text-gray-400 mt-1">This fixed rate will be used instead of shipping zones</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.show_email} onChange={(e) => setForm({ ...form, show_email: e.target.checked })}
                  className="w-4 h-4 accent-[#0f5931]" />
                Show Email Field
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.show_city} onChange={(e) => setForm({ ...form, show_city: e.target.checked })}
                  className="w-4 h-4 accent-[#0f5931]" />
                Show City Field
              </label>
            </div>
            <div>
              <label className={labelCls}>Guarantee Text</label>
              <textarea rows={2} value={form.guarantee_text} onChange={(e) => setForm({ ...form, guarantee_text: e.target.value })}
                className={inputCls + " resize-none"} placeholder="১০০% সন্তুষ্টি গ্যারান্টি" />
            </div>
            <div>
              <label className={labelCls}>Thank You Message</label>
              <textarea rows={2} value={form.success_message} onChange={(e) => setForm({ ...form, success_message: e.target.value })}
                className={inputCls + " resize-none"} placeholder="আপনার অর্ডার সফলভাবে গৃহীত হয়েছে!" />
            </div>
          </Section>

          {/* ─── 10. SEO ─── */}
          <Section title="SEO" icon="🔍" open={isOpen("seo")} onToggle={() => toggle("seo")}>
            <div>
              <label className={labelCls}>Meta Title</label>
              <input
                value={form.meta_title}
                onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                className={inputCls}
                placeholder="Page title for search engines"
              />
            </div>
            <div>
              <label className={labelCls}>Meta Description</label>
              <textarea
                rows={2}
                value={form.meta_description}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                className={inputCls + " resize-none"}
                placeholder="Brief description for search engines"
              />
            </div>
          </Section>

          {/* ─── Submit ─── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#0f5931] text-white rounded-xl text-sm font-semibold hover:bg-[#12693a] transition-colors disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editId
                ? "Update"
                : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Media Gallery */}
      <MediaGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => {
          if (galleryTarget === "hero") {
            setForm({ ...form, hero_image: url });
          } else if (galleryTarget === "features") {
            setForm({ ...form, features_image: url });
          } else if (galleryTarget.startsWith("testimonial-")) {
            const idx = Number(galleryTarget.split("-")[1]);
            if (!isNaN(idx) && idx >= 0 && idx < form.testimonials.length) {
              const updated = [...form.testimonials];
              updated[idx] = { ...updated[idx], image: url };
              updateField("testimonials", updated);
            }
          } else if (galleryTarget.startsWith("problem-")) {
            const idx = Number(galleryTarget.split("-")[1]);
            if (!isNaN(idx) && idx >= 0 && idx < form.problem_points.length) {
              const updated = [...form.problem_points];
              updated[idx] = { ...updated[idx], icon: url };
              updateField("problem_points", updated);
            }
          }
        }}
      />
    </DashboardLayout>
  );
}

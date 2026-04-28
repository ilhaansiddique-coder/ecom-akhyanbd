"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import MediaGallery from "@/components/MediaGallery";
import Modal from "@/components/Modal";
import { useLang } from "@/lib/LanguageContext";
import { theme } from "@/lib/theme";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiImage,
  FiX,
  FiStar,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  image?: string;
  category?: string;
  tags?: string;
  read_time?: number;
  featured?: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_image?: string;
  is_published: boolean;
  published_at?: string;
}

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  image: "",
  category: "",
  tags: "",
  read_time: "" as string | number,
  featured: false,
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  og_image: "",
  is_published: false,
  published_at: "",
};

type FormState = typeof emptyForm;

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

function estimateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function formatDate(dt: string | undefined, lang: string = "bn") {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString(lang === "en" ? "en-US" : "bn-BD");
  } catch {
    return dt;
  }
}

interface InitialData { items: BlogPost[] }

/** Collapsible section header — same look across the form. */
function SectionHeader({
  title,
  desc,
  open,
  toggle,
}: {
  title: string;
  desc?: string;
  open: boolean;
  toggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-5 py-3.5 transition-colors"
    >
      <div className="text-left">
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {open ? (
        <FiChevronUp className="w-4 h-4 text-gray-400" />
      ) : (
        <FiChevronDown className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}

/** Reusable image picker — uses MediaGallery + theme.upload styles. */
function ImagePickerField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className={theme.label}>{label}</label>
      {value ? (
        <div className="relative w-full max-w-xs aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
          <Image src={value} alt={label} fill className="object-cover" sizes="320px" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button type="button" onClick={() => setOpen(true)} className={theme.upload.changeBtn}>
              Change
            </button>
            <button type="button" onClick={() => onChange("")} className={theme.upload.deleteBtn}>
              <FiX className="w-3.5 h-3.5 inline" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${theme.upload.zone(false)} w-full max-w-xs aspect-video flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-primary`}
        >
          <FiImage className="w-7 h-7" />
          <span className="text-xs font-medium">Click to choose image</span>
        </button>
      )}
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
      <MediaGallery
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setOpen(false);
        }}
      />
    </div>
  );
}

export default function BlogClient({ initialData }: { initialData?: InitialData }) {
  const { lang, t } = useLang();
  const [items, setItems] = useState<BlogPost[]>(initialData?.items ?? []);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [openSections, setOpenSections] = useState({
    main: true,
    media: true,
    organization: false,
    seo: false,
    publish: true,
  });
  const toggleSection = (k: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [k]: !prev[k] }));

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" as "success" | "error" });
  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpenSections({ main: true, media: true, organization: false, seo: false, publish: true });
    setModalOpen(true);
  };

  const openEdit = (item: BlogPost) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || "",
      content: item.content || "",
      image: item.image || "",
      category: item.category || "",
      tags: item.tags || "",
      read_time: item.read_time ?? "",
      featured: item.featured || false,
      meta_title: item.meta_title || "",
      meta_description: item.meta_description || "",
      meta_keywords: item.meta_keywords || "",
      og_image: item.og_image || "",
      is_published: item.is_published,
      published_at: item.published_at ? item.published_at.slice(0, 16) : "",
    });
    setOpenSections({ main: true, media: true, organization: false, seo: false, publish: true });
    setModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: editId ? prev.slug : slugify(val),
      // auto-fill SEO meta title if blank
      meta_title: prev.meta_title ? prev.meta_title : val,
    }));
  };

  const handleContentChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      content: val,
      // Auto-estimate read time if user hasn't set it manually
      read_time: prev.read_time === "" ? estimateReadTime(val) : prev.read_time,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Coerce read_time empty string → null for the API
      const payload = {
        ...form,
        read_time: form.read_time === "" ? null : Number(form.read_time),
      };
      if (editId) {
        const res = await api.admin.updateBlogPost(editId, payload);
        const updated = res.data || res;
        setItems((prev) => prev.map((x) => (x.id === editId ? { ...x, ...updated } : x)));
        showToast(t("blog.updated"));
      } else {
        const res = await api.admin.createBlogPost(payload);
        const created = res.data || res;
        setItems((prev) => [created, ...prev]);
        showToast(t("blog.created"));
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
      await api.admin.deleteBlogPost(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      showToast(t("blog.deleted"));
      setDeleteId(null);
    } catch {
      showToast(t("common.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title={t("blog.title")}>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, message: "" })}
      />
      <ConfirmDialog
        open={!!deleteId}
        message={t("blog.confirmDelete")}
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
              placeholder={t("blog.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={theme.inputSearch}
            />
          </div>
          <button onClick={openCreate} className={theme.btn.add}>
            <FiPlus className="w-4 h-4" />
            {t("blog.addNew")}
          </button>
        </div>

        {/* List */}
        <div className={theme.table.wrapper}>
          <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={theme.table.head}>
                  <tr>
                    {[t("blog.thTitle"), t("blog.thSlug"), t("blog.thPublished"), t("blog.thDate"), ""].map(
                      (h) => (
                        <th key={h} className={theme.table.th}>{h}</th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={theme.table.empty}>{t("blog.empty")}</td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={theme.table.row}
                      >
                        <td className={`${theme.table.td} font-medium text-gray-800 max-w-56`}>
                          <div className="flex items-center gap-2">
                            {item.featured && (
                              <FiStar className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Featured" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                        </td>
                        <td className={`${theme.table.td} text-gray-500 font-mono text-xs max-w-36 truncate`}>
                          {item.slug}
                        </td>
                        <td className={theme.table.td}>
                          <span className={`${theme.badge.base} ${item.is_published ? theme.badge.published : theme.badge.draft}`}>
                            {item.is_published ? t("blog.published") : t("blog.draft")}
                          </span>
                        </td>
                        <td className={`${theme.table.td} text-gray-500 whitespace-nowrap`}>
                          {formatDate(item.published_at, lang)}
                        </td>
                        <td className={theme.table.td}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(item)} className={theme.btn.icon.edit}>
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(item.id)} className={theme.btn.icon.delete}>
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
      </motion.div>

      {/* ── Editor Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? t("blog.editTitle") : t("blog.newTitle")}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Main Content */}
          <SectionHeader
            title="Main Content"
            desc="Title, slug, excerpt and full body"
            open={openSections.main}
            toggle={() => toggleSection("main")}
          />
          {openSections.main && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={theme.label}>{t("blog.labelTitle")}</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className={theme.input}
                    placeholder="Post title"
                  />
                </div>
                <div>
                  <label className={theme.label}>{t("blog.labelSlug")}</label>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    className={theme.input}
                    placeholder="post-slug"
                  />
                </div>
              </div>
              <div>
                <label className={theme.label}>{t("blog.labelExcerpt")}</label>
                <textarea
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className={theme.textarea}
                  placeholder="Short summary shown in listings (1–2 sentences)"
                />
              </div>
              <div>
                <label className={theme.label}>{t("blog.labelContent")}</label>
                <textarea
                  required
                  rows={10}
                  value={form.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className={theme.textarea}
                  placeholder="Write your post content here. HTML is allowed."
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Supports HTML. Estimated read time auto-calculates as you type.
                </p>
              </div>
            </div>
          )}

          {/* Featured Image */}
          <SectionHeader
            title="Featured Image"
            desc="Main image shown at top of post and in listings"
            open={openSections.media}
            toggle={() => toggleSection("media")}
          />
          {openSections.media && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <ImagePickerField
                label="Cover image"
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                hint="Recommended: 1200 × 630 (16:9). Used in listings and post header."
              />
            </div>
          )}

          {/* Organization */}
          <SectionHeader
            title="Organization"
            desc="Category, tags, read time, and featured flag"
            open={openSections.organization}
            toggle={() => toggleSection("organization")}
          />
          {openSections.organization && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={theme.label}>Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={theme.input}
                    placeholder="e.g. Tutorials, News, Guides"
                  />
                </div>
                <div>
                  <label className={theme.label}>Read Time (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.read_time}
                    onChange={(e) => setForm({ ...form, read_time: e.target.value })}
                    className={theme.input}
                    placeholder="Auto-calculated from content"
                  />
                </div>
              </div>
              <div>
                <label className={theme.label}>Tags</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className={theme.input}
                  placeholder="comma, separated, tags"
                />
                <p className="text-xs text-gray-400 mt-1.5">Comma-separated. Used for filtering and related posts.</p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className={theme.checkbox}
                />
                <FiStar className="w-3.5 h-3.5 text-amber-500" />
                Featured post (pinned to top of blog)
              </label>
            </div>
          )}

          {/* SEO */}
          <SectionHeader
            title="SEO & Social Sharing"
            desc="Meta tags and OpenGraph image for search engines and social media"
            open={openSections.seo}
            toggle={() => toggleSection("seo")}
          />
          {openSections.seo && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <div>
                <label className={theme.label}>
                  Meta Title{" "}
                  <span className="text-gray-400 font-normal">
                    ({form.meta_title.length}/60)
                  </span>
                </label>
                <input
                  value={form.meta_title}
                  onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                  className={theme.input}
                  placeholder="Defaults to post title if blank"
                  maxLength={70}
                />
              </div>
              <div>
                <label className={theme.label}>
                  Meta Description{" "}
                  <span className="text-gray-400 font-normal">
                    ({form.meta_description.length}/160)
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={form.meta_description}
                  onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                  className={theme.textarea}
                  placeholder="Short description shown in Google search results"
                  maxLength={200}
                />
              </div>
              <div>
                <label className={theme.label}>Meta Keywords</label>
                <input
                  value={form.meta_keywords}
                  onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
                  className={theme.input}
                  placeholder="comma, separated, keywords"
                />
              </div>
              <ImagePickerField
                label="OpenGraph Image (social sharing)"
                value={form.og_image}
                onChange={(url) => setForm({ ...form, og_image: url })}
                hint="Recommended: 1200 × 630. Falls back to featured image if blank."
              />
            </div>
          )}

          {/* Publishing */}
          <SectionHeader
            title="Publishing"
            desc="Visibility status and schedule"
            open={openSections.publish}
            toggle={() => toggleSection("publish")}
          />
          {openSections.publish && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    className={theme.checkbox}
                  />
                  {t("blog.published")}
                </label>
                <div>
                  <label className={theme.label}>{t("blog.labelPublishDate")}</label>
                  <input
                    type="datetime-local"
                    value={form.published_at}
                    onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                    className={theme.input}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className={theme.btn.cancel}
            >
              {t("btn.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={theme.btn.primaryFull}
            >
              {saving ? t("btn.saving") : editId ? t("btn.update") : t("btn.create")}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

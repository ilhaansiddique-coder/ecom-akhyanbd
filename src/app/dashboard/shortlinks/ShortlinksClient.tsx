"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import { FiLink, FiCopy, FiCheck, FiTrash2, FiEdit2, FiPlus, FiExternalLink, FiX, FiBarChart2 } from "react-icons/fi";

interface Shortlink {
  id: number;
  slug: string;
  targetUrl: string;
  hits: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export default function ShortlinksClient() {
  const { lang } = useLang();
  // Delete is admin-only — staff can create + edit but not destroy.
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState<Shortlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Shortlink | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [origin, setOrigin] = useState("");

  // Capture window.origin once on mount so the share link previews use the
  // actual hostname instead of a hardcoded value.
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/shortlinks", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (id: number) => {
    if (!confirm(lang === "en" ? "Delete this shortlink? Anyone using it will get a 404." : "এই শর্টলিঙ্কটি মুছবেন? যারা এটি ব্যবহার করছে তারা 404 পাবে।")) return;
    try {
      const res = await fetch(`/api/v1/admin/shortlinks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setRows((p) => p.filter((r) => r.id !== id));
    } catch {}
  };

  const onToggleActive = async (row: Shortlink) => {
    try {
      const res = await fetch(`/api/v1/admin/shortlinks/${row.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !row.isActive }),
      });
      if (res.ok) {
        const j = await res.json();
        setRows((p) => p.map((r) => r.id === row.id ? j.data : r));
      }
    } catch {}
  };

  const copy = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiLink className="text-[var(--primary)]" />
            {lang === "en" ? "Shortlinks" : "শর্টলিঙ্ক"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === "en"
              ? "Create clean, shareable URLs that redirect to any internal or external page."
              : "যেকোনো ইন্টারনাল বা এক্সটারনাল পেজে রিডাইরেক্ট করার জন্য পরিষ্কার শেয়ারযোগ্য URL তৈরি করুন।"}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:opacity-90"
        >
          <FiPlus className="w-4 h-4" />
          {lang === "en" ? "New Shortlink" : "নতুন শর্টলিঙ্ক"}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          {lang === "en" ? "Loading…" : "লোড হচ্ছে…"}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
          {lang === "en"
            ? "No shortlinks yet. Click \"New Shortlink\" to create one."
            : "এখনো কোনো শর্টলিঙ্ক নেই। নতুন তৈরি করতে \"নতুন শর্টলিঙ্ক\" ক্লিক করুন।"}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((r) => {
              const fullUrl = `${origin}/${r.slug}`;
              return (
                <div key={r.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-[var(--primary)] truncate">/{r.slug}</span>
                        {!r.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            {lang === "en" ? "OFF" : "বন্ধ"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 break-all">→ {r.targetUrl}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{r.hits} {lang === "en" ? "hits" : "হিট"}</p>
                    </div>
                  </div>
                  {/* Two-row action layout for mobile so 6 buttons (Copy, Open,
                      Toggle, Analytics, Edit, Delete) never overflow even at
                      320px. Primary actions on top (Analytics + Copy + Open),
                      secondary on bottom (Disable, Edit, Delete). All buttons
                      grow to share width evenly via flex-1. */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Link
                      href={`/dashboard/shortlinks/${r.id}`}
                      className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-purple-200 bg-purple-50 text-purple-700 flex items-center justify-center gap-1"
                    >
                      <FiBarChart2 className="w-3.5 h-3.5" />
                      {lang === "en" ? "Stats" : "স্ট্যাট"}
                    </Link>
                    <button
                      onClick={() => copy(r.id, fullUrl)}
                      className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 flex items-center justify-center gap-1"
                    >
                      {copiedId === r.id ? <FiCheck className="w-3 h-3 text-green-600" /> : <FiCopy className="w-3 h-3" />}
                      {lang === "en" ? "Copy" : "কপি"}
                    </button>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 flex items-center justify-center gap-1"
                    >
                      <FiExternalLink className="w-3 h-3" />
                      {lang === "en" ? "Open" : "খুলুন"}
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleActive(r)}
                      className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200"
                    >
                      {r.isActive ? (lang === "en" ? "Disable" : "বন্ধ") : (lang === "en" ? "Enable" : "চালু")}
                    </button>
                    <button
                      onClick={() => setEditing(r)}
                      className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 flex items-center justify-center gap-1 text-blue-600"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      {lang === "en" ? "Edit" : "এডিট"}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => onDelete(r.id)}
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-red-200 flex items-center justify-center gap-1 text-red-600"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                        {lang === "en" ? "Delete" : "ডিলিট"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <table className="hidden md:table w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{lang === "en" ? "Short URL" : "শর্ট URL"}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{lang === "en" ? "Target" : "টার্গেট"}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{lang === "en" ? "Hits" : "হিট"}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{lang === "en" ? "Status" : "অবস্থা"}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{lang === "en" ? "Actions" : "অ্যাকশন"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const fullUrl = `${origin}/${r.slug}`;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-[var(--primary)]">/{r.slug}</span>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <p className="text-xs text-gray-600 truncate" title={r.targetUrl}>{r.targetUrl}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.hits}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.isActive ? (lang === "en" ? "Active" : "চালু") : (lang === "en" ? "Disabled" : "বন্ধ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => copy(r.id, fullUrl)} title={lang === "en" ? "Copy URL" : "URL কপি করুন"} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          {copiedId === r.id ? <FiCheck className="w-4 h-4 text-green-600" /> : <FiCopy className="w-4 h-4" />}
                        </button>
                        <a href={fullUrl} target="_blank" rel="noopener noreferrer" title={lang === "en" ? "Open" : "খুলুন"} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          <FiExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => onToggleActive(r)} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">
                          {r.isActive ? (lang === "en" ? "Disable" : "বন্ধ") : (lang === "en" ? "Enable" : "চালু")}
                        </button>
                        <Link href={`/dashboard/shortlinks/${r.id}`} title={lang === "en" ? "Analytics" : "অ্যানালিটিকস"} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600">
                          <FiBarChart2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setEditing(r)} title={lang === "en" ? "Edit" : "এডিট"} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => onDelete(r.id)} title={lang === "en" ? "Delete" : "ডিলিট"} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <ShortlinkForm
          row={editing}
          origin={origin}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ShortlinkForm({
  row,
  origin,
  onClose,
  onSaved,
}: {
  row: Shortlink | null;
  origin: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLang();
  const [slug, setSlug] = useState(row?.slug || "");
  const [targetUrl, setTargetUrl] = useState(row?.targetUrl || "");
  const [isActive, setIsActive] = useState(row?.isActive ?? true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = row
        ? `/api/v1/admin/shortlinks/${row.id}`
        : "/api/v1/admin/shortlinks";
      const res = await fetch(url, {
        method: row ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, target_url: targetUrl, is_active: isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || data?.error || (lang === "en" ? "Failed to save." : "সেভ করতে ব্যর্থ।"));
        return;
      }
      onSaved();
    } catch {
      setError(lang === "en" ? "Network error." : "নেটওয়ার্ক সমস্যা।");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {row ? (lang === "en" ? "Edit Shortlink" : "শর্টলিঙ্ক এডিট") : (lang === "en" ? "New Shortlink" : "নতুন শর্টলিঙ্ক")}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {lang === "en" ? "Slug (the part after /)" : "স্লাগ (/ এর পরের অংশ)"}
            </label>
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden focus-within:border-[var(--primary)]">
              <span className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 whitespace-nowrap">
                {origin || "https://yoursite.com"}/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="schoolbag"
                className="flex-1 px-2 py-2 text-sm focus:outline-none font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {lang === "en"
                ? "Letters, numbers, hyphens, underscores. Must not match existing pages (shop, blog, etc)."
                : "শুধু অক্ষর, নম্বর, হাইফেন, আন্ডারস্কোর। বিদ্যমান পেজের নাম (shop, blog ইত্যাদি) ব্যবহার করা যাবে না।"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {lang === "en" ? "Target URL (where it should redirect to)" : "টার্গেট URL (কোথায় রিডাইরেক্ট হবে)"}
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/shop?category=29 or https://example.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[var(--primary)] focus:outline-none"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {lang === "en"
                ? "Internal path (e.g. /shop?category=29) or full external URL (https://...)."
                : "ইন্টারনাল পাথ (যেমন /shop?category=29) বা সম্পূর্ণ এক্সটারনাল URL (https://...)।"}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            {lang === "en" ? "Active (uncheck to disable without deleting)" : "চালু (ডিলিট না করে বন্ধ রাখতে আনচেক করুন)"}
          </label>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              {lang === "en" ? "Cancel" : "বাতিল"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving
                ? (lang === "en" ? "Saving…" : "সেভ হচ্ছে…")
                : row ? (lang === "en" ? "Save Changes" : "সেভ") : (lang === "en" ? "Create" : "তৈরি করুন")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
